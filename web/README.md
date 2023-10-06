- delete privateAccount.ts
- replace planetLogs.ts

- attackOrGiftsReceived.ts
  or have any events taken from spaceQuery
- globalLogs delayed -> uses spaceQuery's blockHash (to report)
- fleets state based on events (if using spaceQuery) or use a check to see tx was part of the query result (the result already included in the data)

// sentry setup:

pnpm sentry-cli releases --org etherplay new -p conquest-eth `git rev-parse --short HEAD`

pnpm sentry-cli releases --org etherplay -p conquest-eth files `git rev-parse --short HEAD` upload-sourcemaps release/build

pnpm sentry-cli releases --org etherplay -p conquest-eth finalize `git rev-parse --short HEAD`
