/* eslint-disable class-methods-use-this */
export default function createWebhookStub(sendWebhookMessage) {
  return class WebhookStub {
    constructor(id, token) {
      this.id = id;
      this.token = token;
    }

    send(...args) {
      sendWebhookMessage(...args);
      return new Promise(() => {});
    }

    destroy() {}
  };
}
