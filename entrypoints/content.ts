export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('JobBuddy content script loaded.');
  },
});
