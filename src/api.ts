import type {
  ChatGPTAPI,
  ChatGPTUnofficialProxyAPI,
  ChatMessage as ChatResponseV4,
} from 'chatgpt';
import {APIOfficialOptions, APIOptions, APIUnofficialOptions} from './types';
import {logWithTime} from './utils';
import {DB} from './db';

class ChatGPT {
  debug: number;
  readonly apiType: string;
  protected _opts: APIOptions;
  protected _api: ChatGPTAPI | ChatGPTUnofficialProxyAPI | undefined;
  protected _apiOfficial: ChatGPTAPI | undefined;
  protected _apiUnofficialProxy: ChatGPTUnofficialProxyAPI | undefined;
  protected _timeoutMs: number | undefined;
  protected _db: DB;

  constructor(apiOpts: APIOptions, db: DB, debug = 1) {
    this.debug = debug;
    this.apiType = apiOpts.type;
    this._opts = apiOpts;
    this._timeoutMs = undefined;
    this._db = db;
  }

  init = async () => {
    if (this._opts.type == 'official') {
      const {ChatGPTAPI} = await import('chatgpt');
      this._apiOfficial = new ChatGPTAPI(
        this._opts.official as APIOfficialOptions
      );
      this._api = this._apiOfficial;
      this._timeoutMs = this._opts.official?.timeoutMs;
    } else if (this._opts.type == 'unofficial') {
      const {ChatGPTUnofficialProxyAPI} = await import('chatgpt');
      this._apiUnofficialProxy = new ChatGPTUnofficialProxyAPI(
        this._opts.unofficial as APIUnofficialOptions
      );
      this._api = this._apiUnofficialProxy;
      this._timeoutMs = this._opts.unofficial?.timeoutMs;
    } else {
      throw new RangeError('Invalid API type');
    }
    logWithTime('🔮 ChatGPT API has started...');
  };

  sendMessage = async (
    text: string,
    chatId: number,
    onProgress?: (res: ChatResponseV4) => void
  ) => {
    if (!this._api) return;

    const contextDB = await this._db.getContext(chatId);

    const context = {
      conversationId: contextDB?.conversationId,
      parentMessageId: contextDB?.parentMessageId,
    };

    let res: ChatResponseV4;
    if (this.apiType == 'official') {
      if (!this._apiOfficial) return;
      res = await this._apiOfficial.sendMessage(text, {
        ...context,
        onProgress,
        timeoutMs: this._timeoutMs,
      });
    } else {
      res = await this._api.sendMessage(text, {
        ...context,
        onProgress,
        timeoutMs: this._timeoutMs,
      });
    }

    return res;
  };

  resetThread = async (chatId: number) => {
    await this._db.clearContext(chatId);
  };
}

export {ChatGPT};
