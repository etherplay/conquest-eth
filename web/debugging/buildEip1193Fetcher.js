function buildEip1193Fetcher(provider) {
  return function (method, params) {
    if (params == null) {
      params = [];
    }
    let request = {method, params};
    this.emit('debug', {
      action: 'request',
      fetcher: 'Eip1193Fetcher',
      request: deepCopy(request),
      provider: this,
    });
    return provider.request(request).then(
      (response) => {
        // console.log('RESPONSE',response);
        this.emit('debug', {
          action: 'response',
          fetcher: 'Eip1193Fetcher',
          request,
          response,
          provider: this,
        });
        return response;
      },
      (error) => {
        const message = error?.data?.message || error?.message;
        // if (!message) {
        //   console.error(`ERROR`, error);
        // }
        if (
          message &&
          (message.indexOf(` could not be found`) !== -1 || message.indexOf(`No state available for block `) !== -1)
        ) {
          // `<blockNumber> could not be found`
          // `No state available for block <blockHash>`
          console.error(`block not available: `, message, 'retrying....', request);
          let promise = Promise.resolve();
          if (request.params && request.params.length > 0 && request.params[request.params.length - 1] === 'latest') {
            console.log(`request was made against "latest", fetching latest block...`);
            promise = provider.request({method: 'eth_blockNumber', params: []}).then((v) => {
              console.log(`replacing "latest" with "${v}" (${parseInt(v.slice(2), 16)})`);
              request = {
                method: request.method,
                params: [...request.params.slice(0, request.params.length - 1), v],
              };
            });
          }
          return promise.then(() =>
            provider.request(request).then(
              (response) => {
                // console.log('RESPONSE',response);
                this.emit('debug', {
                  action: 'response',
                  fetcher: 'Eip1193Fetcher',
                  request,
                  response,
                  provider: this,
                });
                return response;
              },
              (error) => {
                const message = error?.data?.message || error?.message;
                // if (!message) {
                //   console.error(`ERROR`, error);
                // }
                if (
                  message &&
                  (message.indexOf(` could not be found`) !== -1 ||
                    message.indexOf(`No state available for block `) !== -1)
                ) {
                  // `<blockNumber> could not be found`
                  // `No state available for block <blockHash>`
                  console.error(`block not available again: `, message, 'retrying....', request);
                  return provider.request(request).then(
                    (response) => {
                      // console.log('RESPONSE',response);
                      this.emit('debug', {
                        action: 'response',
                        fetcher: 'Eip1193Fetcher',
                        request,
                        response,
                        provider: this,
                      });
                      return response;
                    },
                    (error) => {
                      const message = error?.data?.message || error?.message;
                      if (
                        message &&
                        (message.indexOf(` could not be found`) !== -1 ||
                          message.indexOf(`No state available for block `) !== -1)
                      ) {
                        console.error(`block not available again and again: `, message, request);
                      }
                      if (error)
                        this.emit('debug', {
                          action: 'response',
                          fetcher: 'Eip1193Fetcher',
                          request,
                          error,
                          provider: this,
                        });
                      throw error;
                    }
                  );
                } else {
                  if (error)
                    this.emit('debug', {
                      action: 'response',
                      fetcher: 'Eip1193Fetcher',
                      request,
                      error,
                      provider: this,
                    });
                  throw error;
                }
              }
            )
          );
        } else {
          if (error)
            this.emit('debug', {
              action: 'response',
              fetcher: 'Eip1193Fetcher',
              request,
              error,
              provider: this,
            });
          throw error;
        }
      }
    );
  };
}
