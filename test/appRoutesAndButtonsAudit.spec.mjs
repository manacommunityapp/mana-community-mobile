import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const appDir = path.join(rootDir, 'app');

function getFiles(dir, exts = ['.tsx', '.ts', '.jsx', '.js']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allAppFiles = getFiles(appDir);
const validRoutes = new Set();
const routePatterns = [];

for (const file of allAppFiles) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/');
  if (path.basename(rel).startsWith('_layout.')) continue;
  
  let route = '/' + rel.replace(/\.[^/.]+$/, '');
  if (route.endsWith('/index')) {
    route = route.slice(0, -6);
    if (route === '') route = '/';
  }
  validRoutes.add(route);
  routePatterns.push({
    file: rel,
    route,
    regex: new RegExp(
      '^' +
      route
        .replace(/\[\.\.\.[^\]]+\]/g, '.*')
        .replace(/\[[^\]]+\]/g, '[^/?#]+') +
      '([?#].*)?$'
    )
  });
}

describe('App-Wide Route, Button & Functionality Audit Spec', () => {

  it('1. Confirms all screen route targets match existing screens in app/', () => {
    const scanDirs = ['app', 'components'];
    const allSourceFiles = [];
    for (const dir of scanDirs) {
      allSourceFiles.push(...getFiles(path.join(rootDir, dir)));
    }

    const routerCallRegex = /(?:router\.(?:push|replace|navigate))\s*\(\s*['"](\/[^'"]+)['"]/g;
    const deadRoutes = [];

    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(rootDir, file).replace(/\\/g, '/');
      let match;
      while ((match = routerCallRegex.exec(content)) !== null) {
        const rawTarget = match[1];
        const [cleanPath] = rawTarget.split(/[?#]/);
        const matches = routePatterns.some(rp => rp.regex.test(cleanPath));
        if (!matches) {
          deadRoutes.push({ file: rel, target: rawTarget });
        }
      }
    }

    assert.strictEqual(
      deadRoutes.length,
      0,
      `Found dead routes: ${JSON.stringify(deadRoutes, null, 2)}`
    );
  });

  it('2. Confirms all role profile tabs have working Change Password routes', () => {
    const roleProfiles = [
      'app/admin-role/tabs/profile.tsx',
      'app/event-admin/tabs/profile.tsx',
      'app/guard/tabs/profile.tsx',
      'app/sports-admin/tabs/profile.tsx',
      'app/vendor/tabs/profile.tsx',
    ];

    for (const rel of roleProfiles) {
      const fullPath = path.join(rootDir, rel);
      assert.ok(fs.existsSync(fullPath), `Profile file must exist: ${rel}`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Must not contain empty onPress on Change Password
      assert.ok(
        !content.includes('label="Change Password" onPress={() => {}}'),
        `Empty onPress found on Change Password in ${rel}`
      );
      assert.ok(
        content.includes('/settings/password'),
        `Expected router.push('/settings/password') in ${rel}`
      );
    }
  });

  it('3. Confirms admin-role security alert assignment is fully functional', () => {
    const secFile = path.join(rootDir, 'app/admin-role/tabs/security.tsx');
    const content = fs.readFileSync(secFile, 'utf-8');
    assert.ok(
      content.includes('handleAssign(item)'),
      'SecurityAlert assign button must invoke handleAssign'
    );
    assert.ok(
      content.includes('adminRoleService.assignAlert'),
      'handleAssign must invoke adminRoleService.assignAlert'
    );
  });

  it('4. Confirms vendor dashboard availability and See All buttons are wired', () => {
    const dashFile = path.join(rootDir, 'app/vendor/tabs/dashboard.tsx');
    const content = fs.readFileSync(dashFile, 'utf-8');
    assert.ok(
      content.includes("router.push('/vendor/availability')"),
      'Vendor availability card must navigate to /vendor/availability'
    );
    assert.ok(
      content.includes("router.push('/vendor/tabs/bookings')"),
      'Upcoming bookings See All must navigate to /vendor/tabs/bookings'
    );
    assert.ok(
      content.includes("router.push('/vendor/tabs/work-orders')"),
      'Work orders See All must navigate to /vendor/tabs/work-orders'
    );
  });

  it('5. Confirms wallet quick action buttons navigate properly', () => {
    const walletFile = path.join(rootDir, 'app/wallet/index.tsx');
    const content = fs.readFileSync(walletFile, 'utf-8');
    assert.ok(
      content.includes("router.push('/tabs/pay')"),
      'Pay Dues button must navigate to /tabs/pay'
    );
    assert.ok(
      content.includes("router.push('/payments/history')"),
      'History button must navigate to /payments/history'
    );
  });

  it('6. Confirms movies back navigation and coming soon alert work properly', () => {
    const movieFile = path.join(rootDir, 'app/movies/index.tsx');
    const content = fs.readFileSync(movieFile, 'utf-8');
    assert.ok(
      content.includes('onPress={onBack}'),
      'ShowtimeSelector must bind back button to onBack'
    );
    assert.ok(
      !content.includes('movie={movie} onPress={() => {}}'),
      'Coming Soon movies must not have empty onPress'
    );
  });

  it('7. Confirms health benefits hospital locator and health records viewer work properly', () => {
    const benFile = path.join(rootDir, 'app/health/benefits/index.tsx');
    const benContent = fs.readFileSync(benFile, 'utf-8');
    assert.ok(
      benContent.includes('Linking.openURL'),
      'Find hospital button must open network locator link'
    );

    const recFile = path.join(rootDir, 'app/health/records/index.tsx');
    const recContent = fs.readFileSync(recFile, 'utf-8');
    assert.ok(
      recContent.includes('handleViewRecord(rec)'),
      'View action button must call handleViewRecord'
    );
  });

  it('8. Confirms split-bill title edit and select-all toggles work properly', () => {
    const splitFile = path.join(rootDir, 'app/split-bill/index.tsx');
    const content = fs.readFileSync(splitFile, 'utf-8');
    assert.ok(
      content.includes('setExpenseTitle'),
      'Pencil icon must enable expense title updating'
    );
    assert.ok(
      content.includes('setSelectedItemIds'),
      'Select All button must toggle line item selection'
    );
  });

  it('9. Confirms zero empty buttons remain across audited modules', () => {
    const targetFiles = [
      'app/admin-role/tabs/profile.tsx',
      'app/event-admin/tabs/profile.tsx',
      'app/guard/tabs/profile.tsx',
      'app/sports-admin/tabs/profile.tsx',
      'app/vendor/tabs/profile.tsx',
      'app/wallet/index.tsx',
      'app/health/benefits/index.tsx',
      'app/experiences/partners.tsx',
    ];

    for (const rel of targetFiles) {
      const fullPath = path.join(rootDir, rel);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        !content.includes('onPress={() => {}}'),
        `Empty onPress found in ${rel}`
      );
    }
  });

});
