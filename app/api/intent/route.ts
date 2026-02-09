/**
 * Sui Intent Agent - Intent 解析 API
 *
 * 功能：
 * 1. 接收用户自然语言输入
 * 2. 调用 LLM 解析意图
 * 3. 返回结构化的 Intent JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import type { LLMIntentResponse } from '@/lib/types';

// LLM API 配置（OpenAI 兼容）
const BASE_URL = process.env.BASE_URL || 'https://openai.linktre.cc/v1/chat/completions';
const API_KEY = process.env.API_KEY;

// System Prompt
const SYSTEM_PROMPT = `你是一个 Sui 区块链交易意图解析助手。

你的任务：将用户的自然语言输入解析成结构化的交易意图。

支持的 Actions：
1. swap - 代币兑换
   - inputToken: 输入代币符号（如 "SUI", "USDT"）
   - amount: 数量
   - outputToken: 输出代币符号
   - slippage: 滑点（小数，如 0.03 = 3%）

2. split - 余额拆分
   - token: 代币符号
   - splits: 拆分比例数组（如 ["50%", "50%"]）
   - recipients: （可选）接收地址数组

3. transfer - 转账
   - token: 代币符号
   - amount: 数量
   - recipient: 接收地址（0x 开头的 Sui 地址）

重要规则：
1. 只输出有效的 JSON，不要有任何其他文本
2. 如果无法解析，返回空的 intents 数组
3. confidence 是 0-1 之间的数字
4. 所有数值都必须是字符串类型
5. 用户可能会组合多个操作，要全部识别

示例：
输入: "把 10 SUI 换成 USDT，滑点 3%"
输出:
{
  "intents": [
    {
      "action": "swap",
      "params": {
        "inputToken": "SUI",
        "outputToken": "USDT",
        "amount": "10",
        "slippage": "0.03"
      },
      "confidence": 0.95
    }
  ],
  "summary": "Swap 10 SUI to USDT with 3% slippage",
  "confidence": 0.95
}

输入: "把我的 SUI 平均分成 3 份"
输出:
{
  "intents": [
    {
      "action": "split",
      "params": {
        "token": "SUI",
        "splits": ["33.33%", "33.33%", "33.34%"]
      },
      "confidence": 0.9
    }
  ],
  "summary": "Split SUI balance into 3 equal parts",
  "confidence": 0.9
}

输入: "转 5 SUI 给 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
输出:
{
  "intents": [
    {
      "action": "transfer",
      "params": {
        "token": "SUI",
        "amount": "5",
        "recipient": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      },
      "confidence": 0.98
    }
  ],
  "summary": "Transfer 5 SUI to 0x1234...",
  "confidence": 0.98
}
`;

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    // 2. 调用 LLM API
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 使用快速模型
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.1, // 低温度，更确定性
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    // 3. 解析 LLM 输出
    let llmResponse: LLMIntentResponse;
    try {
      // 尝试提取 JSON（处理可能的额外文本）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmResponse = JSON.parse(jsonMatch[0]);
      } else {
        llmResponse = JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', content);
      return NextResponse.json(
        {
          error: 'Failed to parse intent',
          intents: [],
          summary: '无法理解您的意图，请重新表述',
          confidence: 0,
        },
        { status: 200 } // 返回 200 而非 500，让前端处理
      );
    }

    // 4. 校验和清理响应
    if (!llmResponse.intents || !Array.isArray(llmResponse.intents)) {
      llmResponse.intents = [];
    }

    // 5. 返回结果
    return NextResponse.json(llmResponse);

  } catch (error) {
    console.error('Intent parsing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        intents: [],
        summary: '服务暂时不可用，请稍后重试',
        confidence: 0,
      },
      { status: 500 }
    );
  }
}
