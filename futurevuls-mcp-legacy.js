#!/usr/bin/env node

/**
 * Enhanced FutureVuls MCP Server with groups.json support (Legacy Version for Cline)
 * 
 * MCPライブラリに依存しない、高機能なJSON-RPC実装
 * fvlib.pyの機能をJavaScriptで再実装 + groups.json対応
 * Protocol Version: 2024-11-05 (Cline Compatible)
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

// 環境変数の設定
const API_TOKEN = process.env.FUTUREVULS_API_TOKEN;
const ORG_TOKEN = process.env.FUTUREVULS_ORG_TOKEN;
const DEBUG = process.env.FUTUREVULS_DEBUG === 'true';

// プロキシ設定
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const HTTP_PROXY = process.env.HTTP_PROXY || process.env.http_proxy;
// デバッグ用ログ関数
function debugLog(message) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`);
  }
}

// groups.json読み込み関数
function loadGroupsConfig() {
  try {
    const configPath = path.join(__dirname, 'groups.json');
    debugLog(`Loading groups config from: ${configPath}`);
    
    if (!fs.existsSync(configPath)) {
      console.error('[WARNING] groups.json not found, using fallback token');
      return null;
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    debugLog(`Successfully loaded ${config.group?.length || 0} groups`);
    return config;
  } catch (error) {
    console.error('[ERROR] Failed to load groups.json:', error.message);
    return null;
  }
}

// グループ情報を整理するヘルパー関数
function parseGroupsConfig(config) {
  if (!config || !config.group) return {};
  
  const groups = {};
  config.group.forEach(groupObj => {
    const groupName = Object.keys(groupObj)[0];
    const groupData = groupObj[groupName];
    groups[groupName] = {
      token: groupData[0],
      totalPages: groupData[1],
      groupId: groupData[2]
    };
  });
  
  return groups;
}

// カレンダー・日付ユーティリティクラス
class FVCalendar {
  constructor(year, month, day) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  // 先週の月曜日を取得（日曜日始まり）
  getLastMonday() {
    const today = new Date(this.year, this.month - 1, this.day);
    const todayDow = today.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
    
    // 先週の月曜日までの日数を計算
    // 日曜日=6日前, 月曜日=7日前, 火曜日=8日前, ..., 土曜日=12日前
    const daysToSubtract = todayDow + 6;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToSubtract);
    
    return lastMonday;
  }

  // 今週の日曜日を取得
  getThisSunday() {
    const today = new Date(this.year, this.month - 1, this.day);
    const todayDow = today.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
    
    // 今週の日曜日を計算
    // 今日が日曜日の場合は今日、それ以外は今週の日曜日（過去の日付）
    const daysToSubtract = todayDow;
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - daysToSubtract);
    
    return thisSunday;
  }

  // 日付を YYYYMMDD 形式でフォーマット
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // 日付を YYYY/MM/DD 形式でフォーマット
  static formatDateSlash(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
}

// FutureVuls API クライアント（groups.json対応版）
class FutureVulsClient {
  constructor(groupName = null) {
    // groups.jsonを読み込み
    this.groupsConfig = loadGroupsConfig();
    this.groups = parseGroupsConfig(this.groupsConfig);
    
    // グループ指定がある場合はそのトークンを使用
    if (groupName && this.groups[groupName]) {
      this.currentGroup = groupName;
      this.apiToken = this.groups[groupName].token;
      this.groupId = this.groups[groupName].groupId;
      this.totalPages = this.groups[groupName].totalPages;
      debugLog(`Using ${groupName} group token: ${this.apiToken.substring(0, 10)}...`);
    } else if (groupName) {
      throw new Error(`Group "${groupName}" not found in groups.json`);
    } else {
      // フォールバック: 環境変数のトークンまたはERMSグループ
      if (this.groups['ERMS']) {
        this.currentGroup = 'ERMS';
        this.apiToken = this.groups['ERMS'].token;
        this.groupId = this.groups['ERMS'].groupId;
        this.totalPages = this.groups['ERMS'].totalPages;
        debugLog('Using ERMS group token as default');
      } else {
        this.apiToken = API_TOKEN;
        debugLog('Using fallback token from environment');
      }
    }
    
    this.baseUrl = 'https://rest.vuls.biz';
    this.headers = {
      'Authorization': this.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // 利用可能なグループ一覧を取得
  getAvailableGroups() {
    return Object.keys(this.groups);
  }

  // グループ情報を取得
  getGroupInfo(groupName) {
    return this.groups[groupName] || null;
  }

  // 全グループの情報を取得
  getAllGroupsInfo() {
    return this.groups;
  }

  async makeRequest(method, endpoint, params = {}) {
    const url = new URL(endpoint, this.baseUrl);
    
    if (method === 'GET' && Object.keys(params).length > 0) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    debugLog(`Making ${method} request to ${url} for group: ${this.currentGroup || 'fallback'}`);

    // 組織レベルAPIの場合は組織トークンを使用
    const isOrgAPI = endpoint.startsWith('/v1/org/');
    const authToken = isOrgAPI ? ORG_TOKEN : this.apiToken;
    
    debugLog(`Using ${isOrgAPI ? 'organization' : 'group'} token for ${endpoint}`);

    const options = {
      method,
      headers: {
        ...this.headers,
        'Authorization': authToken
      },
    };

    // プロキシエージェントの設定
    if (url.toString().startsWith('https://') && HTTPS_PROXY) {
      options.agent = new HttpsProxyAgent(HTTPS_PROXY);
      debugLog(`Using HTTPS proxy: ${HTTPS_PROXY}`);
    } else if (url.toString().startsWith('http://') && HTTP_PROXY) {
      options.agent = new HttpsProxyAgent(HTTP_PROXY);
      debugLog(`Using HTTP proxy: ${HTTP_PROXY}`);
    }

    if (method !== 'GET' && Object.keys(params).length > 0) {
      options.body = JSON.stringify(params);
    }

    try {
      const response = await fetch(url, options);
      
      debugLog(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        
        // 権限エラーの場合は詳細なメッセージを提供
        if (response.status === 403 || response.status === 401) {
          throw new Error(`Authentication/Authorization error (${response.status}): This operation may require admin privileges or organization-level access. Current token may not have sufficient permissions. Error: ${errorText}`);
        }
        
        // 404エラーの場合
        if (response.status === 404) {
          throw new Error(`Endpoint not found (${response.status}): The requested API endpoint may not exist or may have been moved. Error: ${errorText}`);
        }
        
        // 500エラーの場合
        if (response.status === 500) {
          throw new Error(`Server error (${response.status}): Internal server error occurred. This may be due to insufficient token permissions or server-side issues. Error: ${errorText}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        debugLog(`JSON response received`);
        return data;
      } else {
        const text = await response.text();
        debugLog(`Text response: ${text}`);
        
        if (text.trim().toLowerCase() === 'true') return true;
        if (text.trim().toLowerCase() === 'false') return false;
        
        return text;
      }
    } catch (error) {
      console.error(`[ERROR] Request failed: ${error.message}`);
      throw error;
    }
  }

  async getHealth() {
    const result = await this.makeRequest('GET', '/health');
    return typeof result === 'boolean' ? result : true;
  }

  async getCves(options = {}) {
    const { page = 1, limit = 20, filter_cve_id, filter_server_id } = options;
    const params = { page, limit };
    
    if (filter_cve_id) params.filter_cve_id = filter_cve_id;
    if (filter_server_id) params.filter_server_id = filter_server_id;
    
    return await this.makeRequest('GET', '/v1/cves', params);
  }

  // CVE詳細情報取得
  async getCveDetail(cveId) {
    return await this.makeRequest('GET', `/v1/cve/${cveId}`);
  }

  // タスク一覧取得
  async getTasks(options = {}) {
    const { page = 1, limit = 20, filterCveID, filterStatus } = options;
    const params = { page, limit };
    
    if (filterCveID) params.filterCveID = filterCveID;
    if (filterStatus) params.filterStatus = filterStatus;
    
    return await this.makeRequest('GET', '/v1/tasks', params);
  }

  // タスク詳細取得
  async getTaskDetail(taskId) {
    return await this.makeRequest('GET', `/v1/task/${taskId}`);
  }

  async getServers(options = {}) {
    const { page = 1, limit = 20, filter_role_id } = options;
    const params = { page, limit };
    
    if (filter_role_id) params.filter_role_id = filter_role_id;
    
    return await this.makeRequest('GET', '/v1/servers', params);
  }

  async getGroupsetServers(options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = { page, limit };
    
    return await this.makeRequest('GET', '/v1/groupSet/servers', params);
  }

  async getGroupMembers(groupId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = { page, limit };
    
    return await this.makeRequest('GET', `/v1/members`, params);
  }

  async getOrgGroups(options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = { page, limit };
    
    return await this.makeRequest('GET', '/v1/org/groups', params);
  }

  async getOrgMembers(options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = { page, limit };
    
    return await this.makeRequest('GET', '/v1/org/members', params);
  }

  // 全ページのCVEを取得
  async getAllCves(options = {}) {
    let allCves = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getCves({ ...options, page, limit: 1000 });
      
      if (result.cves && result.cves.length > 0) {
        allCves = allCves.concat(result.cves);
        page++;
        
        // 最後のページかチェック
        if (result.paging && page > result.paging.totalPage) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return {
      cves: allCves,
      totalCount: allCves.length
    };
  }

  // 期間とCVSS値でCVEをフィルタリング
  async searchCriticalCves(startDate, endDate, minCvss = 9.0) {
    const allCves = await this.getAllCves();
    
    const filteredCves = allCves.cves.filter(cve => {
      // 作成日時チェック
      if (cve.createdAt) {
        const createdDate = cve.createdAt.substring(0, 10).replace(/-/g, '');
        if (createdDate < startDate || createdDate > endDate) {
          return false;
        }
      }
      
      // CVSS v3スコアチェック
      if (cve.maxV3 && parseFloat(cve.maxV3) >= minCvss) {
        return true;
      }
      
      return false;
    });

    return {
      cves: filteredCves,
      count: filteredCves.length,
      period: `${startDate}-${endDate}`,
      minCvss: minCvss,
      group: this.currentGroup
    };
  }
}

// レポート生成クラス
class FVReport {
  static generateWeeklyReport(criticalCves, period) {
    const today = new Date();
    const report = {
      reportDate: today.toISOString(),
      period: period,
      group: criticalCves.group || 'Unknown',
      summary: {
        totalCount: criticalCves.count,
        cves: criticalCves.cves.map(cve => cve.cveID)
      },
      details: criticalCves.cves.map(cve => ({
        cveID: cve.cveID,
        cvssV3: cve.maxV3,
        createdAt: cve.createdAt,
        summary: cve.summary || 'No summary available'
      }))
    };

    return report;
  }

  static generateTmReport(criticalCves, period) {
    const today = new Date();
    const report = {
      調査期間: period,
      調査日: today.toLocaleString('ja-JP'),
      対象グループ: criticalCves.group || 'Unknown',
      CVE件数: `${criticalCves.count}件`,
      CVEs: criticalCves.cves.map(cve => ({
        [cve.cveID]: {
          内容: cve.summary || 'No summary available',
          CVSSv3: cve.maxV3,
          作成日時: cve.createdAt,
          FutureVulsリンク: `https://console.vuls.biz/org/315/groupset/35/setcves?pane1.tab=all&pane2.show=1&pane2.type=setsetcve&pane2.id=${cve.cveID}`
        }
      }))
    };

    return report;
  }
}

// グローバル変数
let client = null;

// JSON-RPC応答を送信
function sendResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: "2.0",
    id: id
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  console.log(JSON.stringify(response));
}

// JSON-RPC エラー応答
function sendError(id, code, message) {
  sendResponse(id, null, { code, message });
}

// ツール実行
async function executetool(name, args = {}) {
  debugLog(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);

  // クライアント初期化（グループ指定対応）
  if (!client || (args.group && client.currentGroup !== args.group)) {
    const groupName = args.group || null;
    try {
      client = new FutureVulsClient(groupName);
      debugLog(`FutureVuls client initialized for group: ${groupName || 'default'}`);
    } catch (error) {
      throw new Error(`Failed to initialize client: ${error.message}`);
    }
  }

  let result;

  switch (name) {
    case 'futurevuls_health_check':
      result = await client.getHealth();
      return {
        content: [
          {
            type: 'text',
            text: `Health check result: ${result} (Group: ${client.currentGroup || 'fallback'})`,
          },
        ],
      };

    case 'futurevuls_list_groups':
      const groups = client.getAllGroupsInfo();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(groups, null, 2),
          },
        ],
      };

    case 'futurevuls_get_cves':
      result = await client.getCves(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_cve_detail':
      const { cve_id } = args;
      if (!cve_id) {
        throw new Error('cve_id is required');
      }
      result = await client.getCveDetail(cve_id);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_tasks':
      result = await client.getTasks(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_task_detail':
      const { task_id } = args;
      if (!task_id) {
        throw new Error('task_id is required');
      }
      result = await client.getTaskDetail(task_id);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_servers':
      result = await client.getServers(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_groupset_servers':
      result = await client.getGroupsetServers(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_group_members':
      const { group_id } = args;
      if (!group_id) {
        throw new Error('group_id is required');
      }
      result = await client.getGroupMembers(group_id, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_org_groups':
      result = await client.getOrgGroups(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_org_members':
      result = await client.getOrgMembers(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_get_weekly_period':
      const today = new Date();
      const fvcal = new FVCalendar(today.getFullYear(), today.getMonth() + 1, today.getDate());
      const lastMonday = fvcal.getLastMonday();
      const thisSunday = fvcal.getThisSunday();
      
      result = {
        lastMonday: FVCalendar.formatDate(lastMonday),
        thisSunday: FVCalendar.formatDate(thisSunday),
        period: `${FVCalendar.formatDate(lastMonday)}-${FVCalendar.formatDate(thisSunday)}`,
        periodSlash: `${FVCalendar.formatDateSlash(lastMonday)}-${FVCalendar.formatDateSlash(thisSunday)}`
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_search_critical_cves':
      const { start_date, end_date, min_cvss = 9.0, group } = args;
      
      // グループが指定されている場合、クライアントを再初期化
      if (group && client.currentGroup !== group) {
        client = new FutureVulsClient(group);
      }
      
      // 期間が指定されていない場合は先週月曜日〜今週日曜日を使用
      let startDate = start_date;
      let endDate = end_date;
      
      if (!startDate || !endDate) {
        const today = new Date();
        const fvcal = new FVCalendar(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const lastMonday = fvcal.getLastMonday();
        const thisSunday = fvcal.getThisSunday();
        
        startDate = FVCalendar.formatDate(lastMonday);
        endDate = FVCalendar.formatDate(thisSunday);
      }
      
      result = await client.searchCriticalCves(startDate, endDate, min_cvss);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    case 'futurevuls_generate_weekly_report':
      const { start_date: rStartDate, end_date: rEndDate, min_cvss: rMinCvss = 9.0, group: rGroup } = args;
      
      // グループが指定されている場合、クライアントを再初期化
      if (rGroup && client.currentGroup !== rGroup) {
        client = new FutureVulsClient(rGroup);
      }
      
      // 期間が指定されていない場合は先週月曜日〜今週日曜日を使用
      let reportStartDate = rStartDate;
      let reportEndDate = rEndDate;
      
      if (!reportStartDate || !reportEndDate) {
        const today = new Date();
        const fvcal = new FVCalendar(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const lastMonday = fvcal.getLastMonday();
        const thisSunday = fvcal.getThisSunday();
        
        reportStartDate = FVCalendar.formatDate(lastMonday);
        reportEndDate = FVCalendar.formatDate(thisSunday);
      }
      
      const criticalCves = await client.searchCriticalCves(reportStartDate, reportEndDate, rMinCvss);
      const weeklyReport = FVReport.generateWeeklyReport(criticalCves, `${reportStartDate}-${reportEndDate}`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weeklyReport, null, 2),
          },
        ],
      };

    case 'futurevuls_generate_tm_report':
      const { start_date: tmStartDate, end_date: tmEndDate, min_cvss: tmMinCvss = 9.0, group: tmGroup } = args;
      
      // グループが指定されている場合、クライアントを再初期化
      if (tmGroup && client.currentGroup !== tmGroup) {
        client = new FutureVulsClient(tmGroup);
      }
      
      // 期間が指定されていない場合は先週月曜日〜今週日曜日を使用
      let tmReportStartDate = tmStartDate;
      let tmReportEndDate = tmEndDate;
      
      if (!tmReportStartDate || !tmReportEndDate) {
        const today = new Date();
        const fvcal = new FVCalendar(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const lastMonday = fvcal.getLastMonday();
        const thisSunday = fvcal.getThisSunday();
        
        tmReportStartDate = FVCalendar.formatDateSlash(lastMonday);
        tmReportEndDate = FVCalendar.formatDateSlash(thisSunday);
      }
      
      const tmCriticalCves = await client.searchCriticalCves(
        tmReportStartDate.replace(/\//g, ''), 
        tmReportEndDate.replace(/\//g, ''), 
        tmMinCvss
      );
      const tmReport = FVReport.generateTmReport(tmCriticalCves, `${tmReportStartDate}-${tmReportEndDate}`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tmReport, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC リクエスト処理
async function handleRequest(request) {
  const { method, params, id } = request;

  debugLog(`Handling request: ${method}`);

  try {
    switch (method) {
      case 'initialize':
        return sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "futurevuls-enhanced-groups-legacy",
            version: "2.0.0",
          },
        });

      case 'notifications/initialized':
        // 通知なので応答不要
        return;

      case 'tools/list':
        return sendResponse(id, {
          tools: [
            {
              name: 'futurevuls_health_check',
              description: 'FutureVuls API のヘルスチェックを実行',
              inputSchema: {
                type: 'object',
                properties: {
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_list_groups',
              description: 'groups.jsonから利用可能なグループ一覧とトークン情報を取得',
              inputSchema: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
            {
              name: 'futurevuls_get_cves',
              description: '脆弱性一覧を取得。ページネーションとフィルタリングに対応',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  filter_cve_id: { type: 'string', description: '特定のCVE IDでフィルタ' },
                  filter_server_id: { type: 'integer', description: '特定のサーバIDでフィルタ' },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_cve_detail',
              description: '特定のCVEの詳細情報を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  cve_id: { type: 'string', description: 'CVE ID (例: CVE-2021-44228)' },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: ['cve_id'],
              },
            },
            {
              name: 'futurevuls_get_tasks',
              description: 'タスク一覧を取得。フィルタリングに対応',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  filterCveID: { type: 'string', description: 'CVE IDでフィルタ' },
                  filterStatus: { type: 'array', items: { type: 'string' }, description: 'ステータスでフィルタ' },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_task_detail',
              description: '特定のタスクの詳細情報を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  task_id: { type: 'integer', description: 'タスクID' },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: ['task_id'],
              },
            },
            {
              name: 'futurevuls_get_servers',
              description: 'サーバ一覧を取得。ページネーションとフィルタリングに対応',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  filter_role_id: { type: 'integer', description: '特定のロールIDでフィルタ' },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_groupset_servers',
              description: 'グループセットのサーバ一覧を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_group_members',
              description: '特定グループのメンバー一覧を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  group_id: { type: 'integer', description: 'グループID', minimum: 1 },
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: ['group_id'],
              },
            },
            {
              name: 'futurevuls_get_org_groups',
              description: '組織のグループ一覧を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_org_members',
              description: '組織のメンバー一覧を取得',
              inputSchema: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)', default: 1 },
                  limit: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20, 最大: 1000)', default: 20, maximum: 1000 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_get_weekly_period',
              description: '先週月曜日から今週日曜日までの期間を取得',
              inputSchema: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
            {
              name: 'futurevuls_search_critical_cves',
              description: '指定期間内のCVSS v3が指定値以上の脆弱性を検索',
              inputSchema: {
                type: 'object',
                properties: {
                  start_date: { type: 'string', description: '開始日 (YYYYMMDD形式、未指定時は先週月曜日)' },
                  end_date: { type: 'string', description: '終了日 (YYYYMMDD形式、未指定時は今週日曜日)' },
                  min_cvss: { type: 'number', description: '最小CVSS v3スコア (デフォルト: 9.0)', default: 9.0 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_generate_weekly_report',
              description: '週次脆弱性レポートを生成',
              inputSchema: {
                type: 'object',
                properties: {
                  start_date: { type: 'string', description: '開始日 (YYYYMMDD形式、未指定時は先週月曜日)' },
                  end_date: { type: 'string', description: '終了日 (YYYYMMDD形式、未指定時は今週日曜日)' },
                  min_cvss: { type: 'number', description: '最小CVSS v3スコア (デフォルト: 9.0)', default: 9.0 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
            {
              name: 'futurevuls_generate_tm_report',
              description: 'TM会議用の脆弱性レポートを生成',
              inputSchema: {
                type: 'object',
                properties: {
                  start_date: { type: 'string', description: '開始日 (YYYY/MM/DD形式、未指定時は先週月曜日)' },
                  end_date: { type: 'string', description: '終了日 (YYYY/MM/DD形式、未指定時は今週日曜日)' },
                  min_cvss: { type: 'number', description: '最小CVSS v3スコア (デフォルト: 9.0)', default: 9.0 },
                  group: { type: 'string', description: '対象グループ名 (ERMS, DBIPS, GPF等)' }
                },
                required: [],
              },
            },
          ],
        });

      case 'tools/call':
        const { name, arguments: args } = params;
        const result = await executetool(name, args);
        return sendResponse(id, result);

      case 'resources/list':
      case 'prompts/list':
        return sendError(id, -32601, 'Method not found');

      default:
        return sendError(id, -32601, 'Method not found');
    }
  } catch (error) {
    console.error(`[ERROR] Request handling failed:`, error);
    return sendError(id, -32603, `Internal error: ${error.message}`);
  }
}

// メイン処理
async function main() {
  debugLog('Starting Enhanced FutureVuls MCP Server (Legacy) with groups.json support...');

  // groups.jsonの存在確認
  const configPath = path.join(__dirname, 'groups.json');
  if (fs.existsSync(configPath)) {
    debugLog(`Found groups.json at: ${configPath}`);
    const config = loadGroupsConfig();
    if (config && config.group) {
      debugLog(`Loaded ${config.group.length} groups from groups.json`);
    }
  } else {
    console.error('[WARNING] groups.json not found, using fallback tokens');
  }

  // 標準入力からJSON-RPCメッセージを読み取り
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      await handleRequest(request);
    } catch (error) {
      console.error(`[ERROR] Failed to parse JSON-RPC request:`, error);
      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" }
      }));
    }
  });

  debugLog('Enhanced FutureVuls MCP Server (Legacy) ready with groups.json support');
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// サーバー起動
if (require.main === module) {
  main().catch((error) => {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  });
}