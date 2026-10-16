import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { checkPage, validatePolicy } from 'lintapple';

// Exercise the rendered workbench without saving drafts or changing project files.
const policy = validatePolicy(JSON.parse(await readFile(new URL('../ui-policy.json', import.meta.url), 'utf8')));
const url = process.env.GACHA_UI_URL ?? 'http://127.0.0.1:3018/';
const screenshotArg = process.argv.indexOf('--screenshots');
const screenshotDir = screenshotArg < 0 ? null : process.argv[screenshotArg + 1];
const reportArg = process.argv.indexOf('--report');
const reportPath = reportArg < 0 ? null : process.argv[reportArg + 1];
const report = { url, runs: [], findings: [] };
let browser;
try {
  if (screenshotArg >= 0 && !screenshotDir || reportArg >= 0 && !reportPath) throw new Error('Provide a path after --screenshots or --report.');
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch();
  for (const viewport of policy.viewports) for (const colorScheme of policy.colorSchemes) {
    const context = await browser.newContext({ viewport, colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    const inspect = async state => {
      const result = await checkPage(page, policy);
      report.runs.push({ state, viewport, colorScheme, ...result });
      report.findings.push(...result.findings.map(finding => ({ ...finding, state, viewport, colorScheme })));
      // Screenshots can resize/scroll a page and dismiss its focus-sensitive help.
      if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `${viewport.width}-${state}.png`), fullPage: state !== 'help' });
      console.log(`${viewport.width}px ${state}: ${result.findings.length} findings`);
    };
    try {
      const response = await page.goto(url);
      if (!response?.ok()) throw new Error(`App responded with ${response?.status() ?? 'no response'}. Start npm run dev.`);
      await page.locator('[data-app-ready]').waitFor();
      await page.locator('.results-preview').waitFor();
      const previewHeaders = await page.locator('.results-preview thead th').allTextContents();
      if (previewHeaders.length !== 2) throw new Error('The initial current-model results table must be visible without proposed-model columns.');
      if (viewport.width <= 600 && !await page.locator('.results-preview .table-scroll').evaluate(element => element.scrollWidth <= element.clientWidth + 1)) throw new Error('Both current-model columns must fit on a phone without horizontal scrolling.');
      const oversizedHelp = await page.locator('.help-trigger').evaluateAll(elements => elements.filter(element => {
        const size = parseFloat(getComputedStyle(element).fontSize);
        const parentSize = parseFloat(getComputedStyle(element.parentElement).fontSize);
        const box = element.getBoundingClientRect();
        return size !== parentSize || box.width > size + 1 || box.height > size + 1;
      }).length);
      if (oversizedHelp) throw new Error(`${oversizedHelp} help glyphs do not match their line's font size.`);
      await inspect('baseline');
      if (viewport.width <= 900) await page.getByRole('button', { name: 'Library', exact: true }).click();
      const search = page.getByRole('searchbox', { name: 'Search projects' });
      await search.fill('1% + Hard Pity 100');
      await page.locator('.catalog-group').filter({ has: page.getByRole('heading', { name: 'Character collections', exact: true }) }).getByRole('button', { name: '1% + Hard Pity 100', exact: true }).click();
      await page.locator('.candidate-empty').waitFor();
      await page.getByRole('button', { name: 'Load proposal', exact: true }).click();
      await page.getByRole('button', { name: 'Edit proposal', exact: true }).waitFor();
      await inspect('candidate');
      await page.getByRole('button', { name: 'Simulation settings', exact: true }).click();
      await page.locator('dialog[open]').waitFor();
      await inspect('settings');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Edit proposal', exact: true }).click();
      await page.locator('dialog[open]').waitFor();
      await inspect('editor');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Company evidence', exact: true }).click();
      await inspect('company-empty');
      await page.getByRole('button', { name: 'Specialist scenarios', exact: true }).click();
      await page.locator('.specialist-workbench').waitFor();
      await inspect('specialist-empty');
      await page.getByRole('button', { name: 'Catalogue integration', exact: true }).click();
      await page.locator('.integration-workbench').waitFor();
      await inspect('integration');
      await page.getByRole('button', { name: 'Models', exact: true }).click();
      const help = page.getByRole('button', { name: 'About Scope of the lab', exact: true });
      await help.focus();
      await help.press('ArrowDown');
      await page.locator('.help-panel:not([hidden])').waitFor();
      await inspect('help');
      await page.keyboard.press('Escape');
      await page.locator('.help-panel:not([hidden])').waitFor({ state: 'hidden' });
      if (await help.getAttribute('aria-expanded') !== 'false' || !await help.evaluate(element => element === document.activeElement)) throw new Error(`Help did not close and return keyboard focus: ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 350))}`);
      await page.getByRole('button', { name: 'Compare rule sets', exact: true }).click();
      await page.getByText('Comparison complete.', { exact: true }).waitFor({ timeout: 60000 });
      await inspect('results');
      await page.locator('.candidate-selection > summary').click();
      await page.getByRole('button', { name: 'Remove proposal', exact: true }).click();
      await page.locator('.single-model-results').waitFor();
      if ((await page.locator('.single-model-results > .table-scroll > table > thead th').allTextContents()).join('|') !== 'Player experience|Current rules') throw new Error('Removing a proposal must retain current results without proposed-model columns.');
      if (viewport.width <= 600 && !await page.locator('.single-model-results > .table-scroll').evaluate(element => element.scrollWidth <= element.clientWidth + 1)) throw new Error('Current-model results must fit on a phone after removing a proposal.');
      await page.getByRole('button', { name: 'Simulate current rules', exact: true }).click();
      await page.getByText('Baseline analysis complete.', { exact: true }).waitFor({ timeout: 60000 });
      await page.locator('.single-model-results').waitFor();
      await inspect('baseline-results');
      const selectExample = async (file, mode) => {
        const example = JSON.parse(await readFile(new URL(`../projects/${file}`, import.meta.url), 'utf8'));
        if (viewport.width <= 900) await page.getByRole('button', { name: 'Library', exact: true }).click();
        await page.getByRole('tab', { name: mode, exact: true }).click();
        await page.getByRole('searchbox', { name: `Search ${mode.toLowerCase()}` }).fill(example.name);
        await page.locator(`[data-project-path="${file}"]`).click();
        await page.getByRole('heading', { name: example.name, exact: true, level: 2 }).waitFor();
      };
      await selectExample('characters/genshin-character.json', 'Projects');
      await page.locator('.results-preview').waitFor();
      await inspect('game-context');
      await page.locator('.overview-scope > summary').click();
      await page.locator('.overview-scope a').waitFor();
      await inspect('game-sources');
      await selectExample('company/synthetic-company-pilot.json', 'Companies');
      await page.getByRole('button', { name: 'Company settings', exact: true }).waitFor();
      await inspect('company');
      await page.getByRole('button', { name: 'Company settings', exact: true }).click();
      await page.locator('dialog[open]').waitFor();
      await inspect('company-settings');
      await page.keyboard.press('Escape');
      for (const [file, kind] of [['7778009ece1209725180e952.json', 'payout'], ['b41b9210898817bb22ccb027.json', 'collectible']]) {
        await selectExample(`specialist/${file}`, 'Projects');
        await page.getByRole('button', { name: 'Profile settings', exact: true }).waitFor();
        await inspect(kind);
        await page.getByRole('button', { name: 'Profile settings', exact: true }).click();
        await page.locator('dialog[open]').waitFor();
        await inspect(`${kind}-settings`);
        await page.keyboard.press('Escape');
      }
      if (failures.length) throw new Error(`Browser errors: ${failures.join('; ')}`);
    } finally { await context.close(); }
  }
  console.log(`${report.findings.length ? 'Failed' : 'Passed'}: ${report.findings.length} findings across ${report.runs.length} states.`);
  for (const finding of report.findings) console.log(`${finding.viewport.width}px ${finding.state}: ${finding.rule}\n${finding.selector}\n${finding.message}`);
  process.exitCode = report.findings.length ? 1 : 0;
} catch (error) {
  console.error(`UI check could not finish: ${error.message}`);
  console.error('Start the app with npm run dev. If Chromium is missing, run npx playwright install chromium --only-shell.');
  process.exitCode = 2;
} finally {
  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2));
  }
  await browser?.close();
}
