const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(ROOT, 'clinic-app', 'resources', 'js');
const TARGET_DIR = path.join(ROOT, 'janjicare-frontend', 'src');

console.log('Source:', SOURCE_DIR);
console.log('Target:', TARGET_DIR);

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function transformFile(sourcePath, targetPath, isTsx = true) {
  let content = fs.readFileSync(sourcePath, 'utf8');

  // Step 1: Strip TypeScript using esbuild
  try {
    const transformed = esbuild.transformSync(content, {
      loader: isTsx ? 'tsx' : 'ts',
      jsx: 'preserve',
      target: 'es2022',
    });
    content = transformed.code;
  } catch (err) {
    console.error(`Failed to transform ${sourcePath}:`, err.message);
    // fallback to original if transform fails
  }

  // Step 2: Path fixes (lowercase component directories for standard modern React)
  content = content.replace(/@\/Components\//g, '@/components/');
  content = content.replace(/@\/Layouts\//g, '@/layouts/');
  content = content.replace(/@\/Pages\//g, '@/pages/');
  content = content.replace(/@\/Utils\//g, '@/utils/');
  content = content.replace(/@\/hooks\//g, '@/hooks/');

  // Step 3: Inject route helper if route() is used but not imported
  if (/\broute\(/.test(content) && !/import.*route.*from/.test(content)) {
    content = `import route from '@/utils/route';\n` + content;
  }

  // Step 4: Ensure React is in scope for any files that need JSX or React hooks
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Transformed: ${path.relative(ROOT, targetPath)}`);
}

function processDirectory(sourceDir, targetSubdir) {
  if (!fs.existsSync(sourceDir)) return;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullSourcePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullSourcePath, path.join(targetSubdir, entry.name.toLowerCase()));
    } else {
      const ext = path.extname(entry.name);
      if (ext === '.tsx' || ext === '.ts' || ext === '.jsx' || ext === '.js') {
        const baseName = path.basename(entry.name, ext);
        const newExt = (ext === '.tsx' || ext === '.jsx') ? '.jsx' : '.js';
        const targetPath = path.join(TARGET_DIR, targetSubdir, baseName + newExt);
        transformFile(fullSourcePath, targetPath, ext === '.tsx' || ext === '.jsx');
      }
    }
  }
}

console.log('\n--- Migrating Components ---');
processDirectory(path.join(SOURCE_DIR, 'Components'), 'components');

console.log('\n--- Migrating Layouts ---');
processDirectory(path.join(SOURCE_DIR, 'Layouts'), 'layouts');

console.log('\n--- Migrating Pages ---');
processDirectory(path.join(SOURCE_DIR, 'Pages'), 'pages');

console.log('\n--- Migrating hooks ---');
processDirectory(path.join(SOURCE_DIR, 'hooks'), 'hooks');

console.log('\n--- Migrating Utils ---');
processDirectory(path.join(SOURCE_DIR, 'Utils'), 'utils');

console.log('\nMigration complete!');
