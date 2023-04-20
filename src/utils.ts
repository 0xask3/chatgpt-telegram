import type {FetchFn, openai} from 'chatgpt';
import config from 'config';
import dotenv from 'dotenv';
import pkg from 'https-proxy-agent';
import fetch, {type RequestInfo, type RequestInit} from 'node-fetch';
import {
  Config,
  APIBrowserOptions,
  APIOfficialOptions,
  APIUnofficialOptions,
} from './types';

const {HttpsProxyAgent} = pkg;

dotenv.config();

function loadConfig(): Config {
  function tryGet<T>(key: string): T | undefined {
    if (!config.has(key)) {
      return undefined;
    } else {
      return config.get<T>(key);
    }
  }

  let fetchFn: FetchFn | undefined = undefined;
  const proxy = tryGet<string>('proxy') || process.env.http_proxy;
  if (proxy) {
    const proxyAgent = new HttpsProxyAgent(proxy);
    fetchFn = ((url, opts) =>
      fetch(
        url as RequestInfo,
        {...opts, agent: proxyAgent} as RequestInit
      )) as FetchFn;
  }

  const apiType = config.get<'browser' | 'official' | 'unofficial'>('api.type');
  let apiBrowserCfg: APIBrowserOptions | undefined;
  let apiOfficialCfg: APIOfficialOptions | undefined;
  let apiUnofficialCfg: APIUnofficialOptions | undefined;
  if (apiType == 'official') {
    apiOfficialCfg = {
      apiKey: config.get<string>('api.official.apiKey'),
      apiBaseUrl: tryGet<string>('api.official.apiBaseUrl') || undefined,
      completionParams:
        tryGet<
          Partial<Omit<openai.CreateChatCompletionRequest, 'messages' | 'n'>>
        >('api.official.completionParams') || undefined,
      systemMessage: tryGet<string>('api.official.systemMessage') || undefined,
      maxModelTokens:
        tryGet<number>('api.official.maxModelTokens') || undefined,
      maxResponseTokens:
        tryGet<number>('api.official.maxResponseTokens') || undefined,
      timeoutMs: tryGet<number>('api.official.timeoutMs') || undefined,
      fetch: fetchFn,
      debug: config.get<number>('debug') >= 2,
    };
  } else if (apiType == 'unofficial') {
    apiUnofficialCfg = {
      accessToken: String(process.env.ACCESS_TOKEN) || '',
      apiReverseProxyUrl: String(process.env.REVERSE_PROXY) || undefined,
      model: tryGet<string>('api.unofficial.model') || undefined,
      timeoutMs: tryGet<number>('api.unofficial.timeoutMs') || undefined,
      fetch: fetchFn,
      debug: config.get<number>('debug') >= 2,
    };
  } else {
    throw new RangeError('Invalid API type');
  }

  const cfg = {
    debug: tryGet<number>('debug') || 1,
    bot: {
      token: String(process.env.BOT_TOKEN) || '',
      userIds: tryGet<number[]>('bot.userIds') || [],
      groupIds: tryGet<number[]>('bot.groupIds') || [],
      chatCmd: tryGet<string>('bot.chatCmd') || '/chat',
      queue: config.get<boolean>('bot.queue') ?? true,
    },
    api: {
      type: apiType,
      browser: apiBrowserCfg,
      official: apiOfficialCfg,
      unofficial: apiUnofficialCfg,
    },
    proxy: proxy,
  };

  return cfg;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logWithTime(...args: any[]) {
  console.log(new Date().toLocaleString(), ...args);
}

export {loadConfig, logWithTime};
