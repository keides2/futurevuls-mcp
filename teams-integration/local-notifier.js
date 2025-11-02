#!/usr/bin/env node

/**
 * Local Notifier for FutureVuls
 * 
 * クラウドサービス不要のローカル通知システム
 * - Windows トースト通知
 * - HTMLレポート生成
 * - ブラウザで自動表示
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const notifier = require('node-notifier');
const { exec } = require('child_process');

// 環境変数
const DEBUG = process.env.DEBUG === 'true';
const MIN_SEVERITY = process.env.MIN_SEVERITY || 'high';
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined;

// デバッグログ
function debugLog(message, data = null) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`);
    if (data) console.error(JSON.stringify(data, null, 2));
  }
}

// groups.json を読み込む
function loadGroupsConfig() {
  const groupsPath = process.env.GROUPS_JSON_PATH || '../groups.json';
  const fullPath = path.resolve(__dirname, groupsPath);
  
  try {
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`groups.json の読み込みに失敗: ${error.message}`);
    return null;
  }
}

// FutureVuls API を呼び出す
async function callFutureVulsAPI(endpoint, token, orgToken) {
  const url = `https://rest.vuls.biz${endpoint}`;
  debugLog(`API呼び出し: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    agent
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// 重要度レベルを数値化
function getSeverityLevel(severity) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return levels[severity?.toLowerCase()] || 0;
}

// HTMLレポートを生成
function generateHTMLReport(vulnerabilities, groupName, filterConfig = {}) {
  const minLevel = getSeverityLevel(MIN_SEVERITY);
  const filtered = vulnerabilities.filter(v => getSeverityLevel(v.severity) >= minLevel);
  
  const counts = {
    critical: filtered.filter(v => v.severity?.toLowerCase() === 'critical').length,
    high: filtered.filter(v => v.severity?.toLowerCase() === 'high').length,
    medium: filtered.filter(v => v.severity?.toLowerCase() === 'medium').length,
    low: filtered.filter(v => v.severity?.toLowerCase() === 'low').length
  };
  
  // フィルター条件の文字列を生成
  const filterInfo = {
    minSeverity: MIN_SEVERITY.toUpperCase(),
    totalCount: vulnerabilities.length,
    filteredCount: filtered.length,
    apiEndpoint: '/v1/cves',
    timestamp: new Date().toLocaleString('ja-JP')
  };
  
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FutureVuls 脆弱性レポート - ${groupName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 2em; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .summary-card .count {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
    }
    .critical { color: #dc3545; }
    .high { color: #fd7e14; }
    .medium { color: #ffc107; }
    .low { color: #0dcaf0; }
    .vulns-list { padding: 30px; }
    .vuln-item {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .vuln-item.critical { border-left-color: #dc3545; }
    .vuln-item.high { border-left-color: #fd7e14; }
    .vuln-item.medium { border-left-color: #ffc107; }
    .vuln-item.low { border-left-color: #0dcaf0; }
    .vuln-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .vuln-cve {
      font-size: 1.2em;
      font-weight: bold;
    }
    .vuln-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
      color: white;
    }
    .badge-critical { background: #dc3545; }
    .badge-high { background: #fd7e14; }
    .badge-medium { background: #ffc107; color: #333; }
    .badge-low { background: #0dcaf0; }
    .vuln-summary { 
      color: #666;
      line-height: 1.6;
      margin: 10px 0;
    }
    .vuln-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      font-size: 0.9em;
      color: #666;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
    }
    .filter-info {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 30px;
      border-radius: 4px;
    }
    .filter-info h3 {
      margin-bottom: 10px;
      color: #856404;
    }
    .filter-info ul {
      list-style: none;
      margin: 0;
    }
    .filter-info li {
      padding: 5px 0;
      color: #856404;
    }
    .filter-info li strong {
      display: inline-block;
      width: 150px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 FutureVuls 脆弱性レポート</h1>
      <p>グループ: ${groupName}</p>
      <p>生成日時: ${filterInfo.timestamp}</p>
    </div>
    
    <div class="filter-info">
      <h3>📋 レポート条件</h3>
      <ul>
        <li><strong>データソース:</strong> FutureVuls API ${filterInfo.apiEndpoint}</li>
        <li><strong>最低重要度:</strong> ${filterInfo.minSeverity} 以上</li>
        <li><strong>取得件数:</strong> ${filterInfo.totalCount}件</li>
        <li><strong>表示件数:</strong> ${filterInfo.filteredCount}件 (${filterInfo.minSeverity}以上)</li>
        <li><strong>ページネーション:</strong> 最初の20件のみ取得</li>
      </ul>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="critical count">${counts.critical}</div>
        <div>🔴 Critical</div>
      </div>
      <div class="summary-card">
        <div class="high count">${counts.high}</div>
        <div>🟠 High</div>
      </div>
      <div class="summary-card">
        <div class="medium count">${counts.medium}</div>
        <div>🟡 Medium</div>
      </div>
      <div class="summary-card">
        <div class="low count">${counts.low}</div>
        <div>🔵 Low</div>
      </div>
    </div>
    
    <div class="vulns-list">
      <h2 style="margin-bottom: 20px;">検出された脆弱性</h2>
      ${filtered.map(vuln => `
        <div class="vuln-item ${vuln.severity?.toLowerCase() || 'low'}">
          <div class="vuln-header">
            <span class="vuln-cve">${vuln.cveID || 'N/A'}</span>
            <span class="vuln-badge badge-${vuln.severity?.toLowerCase() || 'low'}">
              ${vuln.severity || 'Unknown'}
            </span>
          </div>
          <div class="vuln-summary">${vuln.summary || 'No summary available'}</div>
          <div class="vuln-details">
            <div><strong>CVSS Score:</strong> ${vuln.cvss?.score || 'N/A'}</div>
            <div><strong>Server:</strong> ${vuln.serverName || 'Unknown'}</div>
            <div><strong>Package:</strong> ${vuln.packageName || 'N/A'}</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p>Generated by FutureVuls Local Notifier</p>
      <p><a href="https://vuls.biz/" target="_blank">FutureVuls で詳細を確認</a></p>
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

// Windows トースト通知を表示
function showNotification(counts, groupName) {
  const criticalCount = counts.critical || 0;
  const highCount = counts.high || 0;
  
  let message = `Critical: ${criticalCount}, High: ${highCount}`;
  let title = `🔒 FutureVuls レポート - ${groupName}`;
  
  notifier.notify({
    title: title,
    message: message,
    icon: path.join(__dirname, 'icon.png'), // オプション: アイコン
    sound: criticalCount > 0, // Criticalがある場合のみサウンド
    wait: true
  });
  
  console.log(`📢 通知を表示しました: ${message}`);
}

// メイン処理
async function main() {
  try {
    console.log('🚀 FutureVuls Local Notifier を起動しています...\n');
    
    const groupsConfig = loadGroupsConfig();
    if (!groupsConfig || !groupsConfig.group) {
      throw new Error('groups.json の読み込みに失敗しました');
    }
    
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }
    
    for (const groupObj of groupsConfig.group) {
      const groupName = Object.keys(groupObj)[0];
      const [token, totalPages, groupId] = groupObj[groupName];
      
      console.log(`\n📊 グループ "${groupName}" の脆弱性を取得中...`);
      
      try {
        // CVE一覧を取得
        const cvesData = await callFutureVulsAPI('/v1/cves', token, groupId);
        
        const vulnerabilities = [];
        if (cvesData.cves && Array.isArray(cvesData.cves)) {
          cvesData.cves.forEach(cve => {
            // サーバー情報を取得
            const serverName = cve.servers && cve.servers.length > 0 
              ? cve.servers[0].serverName 
              : 'Unknown';
            
            vulnerabilities.push({
              cveID: cve.cveID,
            severity: cve.severity || (cve.maxV3 >= 9.0 ? 'critical' : cve.maxV3 >= 7.0 ? 'high' : cve.maxV3 >= 4.0 ? 'medium' : 'low'),
            summary: cve.summary,
            cvss: { score: cve.maxV3 || cve.maxV2 || 0 },
            serverName: serverName,
            packageName: cve.packageName || 'N/A'
          });
        });
      }
      
      console.log(`   検出された脆弱性: ${vulnerabilities.length}件`);
      
      if (vulnerabilities.length > 0) {
        // HTMLレポート生成
        const html = generateHTMLReport(vulnerabilities, groupName);
        const reportPath = path.join(
          reportsDir, 
          `report-${groupName}-${Date.now()}.html`
        );
        fs.writeFileSync(reportPath, html, 'utf8');
        console.log(`   📄 レポート生成: ${reportPath}`);
        
        // 通知表示
        const counts = {
          critical: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'critical').length,
          high: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'high').length
        };
        showNotification(counts, groupName);
        
        // ブラウザで開く
        console.log(`   🌐 ブラウザでレポートを開いています...`);
        exec(`start "" "${reportPath}"`);
      } else {
        console.log('   通知する脆弱性はありません');
      }
      
      } catch (groupError) {
        console.error(`   ❌ グループ "${groupName}" の処理中にエラー: ${groupError.message}`);
        if (DEBUG) console.error(groupError.stack);
        console.log('   → このグループをスキップして続行します');
      }
    }
    
    console.log('\n✨ 処理が完了しました');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    if (DEBUG) console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateHTMLReport, showNotification };
