const puppeteer = require('puppeteer-core');
const path = require('path');

const SCREENSHOT_DIR = '/Users/houzi/code/06-production-business-money-live/sui-intent-agent/submission_package/screenshots';

(async () => {
  console.log('🔗 Connecting to browser...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:49783'
  });
  
  // 关闭所有旧页面
  const pages = await browser.pages();
  for (const page of pages) {
    await page.close();
  }
  
  // 创建新页面
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // 截图1: 首页
  console.log('📸 Screenshot 1: Homepage');
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-1-home.png') });
  console.log('✅ Done');
  
  // 查找并输入文本到 textarea
  console.log('📝 Typing text...');
  try {
    // 等待 textarea 出现
    await page.waitForSelector('textarea', { timeout: 5000 });
    
    // 使用真实的 type 方法，而不是 evaluate
    await page.click('textarea');
    await page.type('textarea', '把 10 SUI 换成 USDT，滑点 3%', { delay: 100 });
    console.log('✅ Text entered');
  } catch (e) {
    console.log('⚠️  Textarea error:', e.message);
  }
  
  await page.waitForTimeout(1000);
  
  // 截图2: 输入后
  console.log('📸 Screenshot 2: After input');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-2-input.png') });
  console.log('✅ Done');
  
  // 点击解析按钮
  console.log('🔘 Clicking Parse button...');
  try {
    // 使用真实的 click 方法
    await page.waitForSelector('button', { timeout: 5000 });
    
    // 查找包含"解析"文字的按钮并点击
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const parseBtn = buttons.find(b => b.textContent.includes('解析'));
      if (parseBtn) {
        parseBtn.click();
      }
    });
    console.log('✅ Button clicked');
  } catch (e) {
    console.log('⚠️  Button error:', e.message);
  }
  
  await page.waitForTimeout(1000);
  
  // 截图3: 点击解析后
  console.log('📸 Screenshot 3: After clicking parse');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-3-clicked.png') });
  console.log('✅ Done');
  
  // 等待 AI 思考完成
  console.log('⏳ Waiting for AI thinking (8s)...');
  await page.waitForTimeout(8000);
  
  // 截图4: AI 思考中/完成后
  console.log('📸 Screenshot 4: AI thinking/complete');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-4-thinking.png') });
  console.log('✅ Done');
  
  // 再等待一下看摘要是否出现
  console.log('⏳ Waiting for summary (3s)...');
  await page.waitForTimeout(3000);
  
  // 截图5: 交易摘要
  console.log('📸 Screenshot 5: Transaction summary');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-5-summary.png') });
  console.log('✅ Done');
  
  // 点击钱包按钮
  console.log('🔘 Clicking Wallet button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const walletBtn = buttons.find(b => b.textContent.includes('连接') || b.textContent.includes('Wallet'));
    if (walletBtn) {
      walletBtn.click();
    }
  });
  
  await page.waitForTimeout(2000);
  
  // 截图6: 钱包连接
  console.log('📸 Screenshot 6: Wallet connection');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot-6-wallet.png') });
  console.log('✅ Done');
  
  console.log('\n✅ All screenshots complete!');
  await browser.disconnect();
})().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
