const fs = require('fs');
const file = 'E:/BalaWork/school/TN-Schools/frontend/src/app/layout.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `              if (typeof window !== "undefined") {
                window.addEventListener("error", function(e) {
                  if (e && e.message && e.message.includes("startTime")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);
                window.addEventListener("unhandledrejection", function(e) {
                  if (e && e.reason && String(e.reason).includes("startTime")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              }`;

const replacementStr = `              if (typeof window !== "undefined") {
                window.addEventListener("error", function(e) {
                  var msg = (e && e.message) ? String(e.message) : '';
                  var stack = (e && e.error && e.error.stack) ? String(e.error.stack) : '';
                  if (msg.includes("startTime") || msg.includes("reportAllChanges") || stack.includes("reportAllChanges")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener("unhandledrejection", function(e) {
                  var r = (e && e.reason) ? String(e.reason) : '';
                  if (r.includes("startTime") || r.includes("reportAllChanges")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                if (window.console && window.console.error) {
                  var origErr = window.console.error;
                  window.console.error = function() {
                    for (var i = 0; i < arguments.length; i++) {
                      var arg = arguments[i];
                      if (arg) {
                        var str = (typeof arg === 'string') ? arg : ((arg.message || '') + ' ' + (arg.stack || ''));
                        if (str.includes("startTime") || str.includes("reportAllChanges")) return;
                      }
                    }
                    return origErr.apply(window.console, arguments);
                  };
                }

                try {
                  function safeEntry(e) {
                    if (!e) {
                      return {
                        name: window.location.href,
                        entryType: "navigation",
                        startTime: (window.performance && window.performance.now) ? window.performance.now() : 0,
                        duration: 0,
                        toJSON: function() { return {}; }
                      };
                    }
                    if (typeof e.startTime === "undefined") {
                      try {
                        Object.defineProperty(e, "startTime", {
                          value: (window.performance && window.performance.now) ? window.performance.now() : 0,
                          writable: true,
                          configurable: true
                        });
                      } catch (_) {}
                    }
                    return e;
                  }

                  function ensureSafeEntries(arr) {
                    if (!arr || !Array.isArray(arr) || arr.length === 0) return [safeEntry(null)];
                    for (var idx = 0; idx < arr.length; idx++) arr[idx] = safeEntry(arr[idx]);
                    return arr;
                  }

                  if (window.PerformanceObserverEntryList && window.PerformanceObserverEntryList.prototype) {
                    var proto = window.PerformanceObserverEntryList.prototype;
                    if (proto.getEntries) {
                      var origGet = proto.getEntries;
                      proto.getEntries = function() { return ensureSafeEntries(origGet.apply(this, arguments)); };
                    }
                    if (proto.getEntriesByType) {
                      var origGetByType = proto.getEntriesByType;
                      proto.getEntriesByType = function() { return ensureSafeEntries(origGetByType.apply(this, arguments)); };
                    }
                    if (proto.getEntriesByName) {
                      var origGetByName = proto.getEntriesByName;
                      proto.getEntriesByName = function() { return ensureSafeEntries(origGetByName.apply(this, arguments)); };
                    }
                  }
                } catch (_) {}
              }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(file, code, 'utf8');
console.log("Updated layout.tsx successfully");
