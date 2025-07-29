#!/usr/bin/env node

/**
 * FutureVuls MCP Server - Enhanced Version
 * 
 * 機能:
 * - FutureVuls開発者向けAPIの完全なラッパー
 * - CVE情報の取得と詳細検索
 * - タスク管理とワークフロー
 * - サーバー情報管理
 * - 高度なフィルタリングと検索
 * - レポート生成とExcel出力
 * - 統計情報の取得
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class FutureVulsAPI {
  constructor() {
    this.baseUrl = 'https://rest.vuls.biz/';
    this.headers = {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    };
    this.proxies = null; // プロキシ設定（必要に応じて）
  }

  /**
   * 設定をファイルから読み込み
   */
  async loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'futurevuls_config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // プロキシ設定があれば適用
      if (config.proxy) {
        this.proxies = config.proxy;
      }
      
      return config;
    } catch (error) {
      console.error('設定ファイルの読み込みに失敗:', error);
      return {};
    }
  }

  /**
   * HTTP リクエストの実行
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API リクエストエラー:', error);
      throw error;
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    const url = `${this.baseUrl}health`;
    return await this.makeRequest(url);
  }

  /**
   * CVE一覧の取得（拡張版）
   */
  async getCves(params = {}) {
    const url = new URL(`${this.baseUrl}v1/cves`