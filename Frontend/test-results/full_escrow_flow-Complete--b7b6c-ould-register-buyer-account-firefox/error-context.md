# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:esbuild] Transform failed with 1 error: /Users/kidanekal/Desktop/code/SafeDeal/Frontend/src/lib/api.ts:208:20: ERROR: Expected \";\" but found \":\""
  - generic [ref=e5]: /Users/kidanekal/Desktop/code/SafeDeal/Frontend/src/lib/api.ts:208:20
  - generic [ref=e6]: "Expected \";\" but found \":\" 206| 207| // Helper function to get multiple escrows by IDs 208| getMultipleByIds: async (ids: number[]): Promise<Escrow[]> => { | ^ 209| const promises = ids.map(id => escrowApi.getById(id)); 210| const responses = await Promise.allSettled(promises);"
  - generic [ref=e7]: at failureErrorWithLog (/Users/kidanekal/Desktop/code/SafeDeal/Frontend/node_modules/esbuild/lib/main.js:1649:15) at /Users/kidanekal/Desktop/code/SafeDeal/Frontend/node_modules/esbuild/lib/main.js:847:29 at responseCallbacks.<computed> (/Users/kidanekal/Desktop/code/SafeDeal/Frontend/node_modules/esbuild/lib/main.js:703:9) at handleIncomingPacket (/Users/kidanekal/Desktop/code/SafeDeal/Frontend/node_modules/esbuild/lib/main.js:762:9) at Socket.readFromStdout (/Users/kidanekal/Desktop/code/SafeDeal/Frontend/node_modules/esbuild/lib/main.js:679:7) at Socket.emit (node:events:518:28) at addChunk (node:internal/streams/readable:561:12) at readableAddChunkPushByteMode (node:internal/streams/readable:512:3) at Readable.push (node:internal/streams/readable:392:5) at Pipe.onStreamRead (node:internal/stream_base_commons:189:23
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.js.
```