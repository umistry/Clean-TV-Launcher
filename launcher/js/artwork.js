// Read app artwork from Samsung's local cache. No app images are bundled.
(function (A) {
  "use strict";

  var ICON_CACHE = "/opt/share/webappservice/apps_icon/all";
  var LEARNED_KEY = "aerotizen.artwork.storeIds.v1";
  var learned = readLearned();
  var checked = Object.create(null);
  var learning = false;

  function readLearned() {
    var result = Object.create(null);
    try {
      var saved = JSON.parse(window.localStorage.getItem(LEARNED_KEY) || "{}");
      Object.keys(saved).forEach(function (appId) {
        if (typeof saved[appId] === "string" && /^\d+$/.test(saved[appId])) {
          result[appId] = saved[appId];
        }
      });
    } catch (e) {
      /* storage is optional */
    }
    return result;
  }

  function saveLearned() {
    try {
      window.localStorage.setItem(LEARNED_KEY, JSON.stringify(learned));
    } catch (e) {
      /* storage is optional */
    }
  }

  function cachedStore(app) {
    return (app.icon || "").match(/^\/opt\/share\/webappservice\/apps_icon\/(?:all|FirstScreen)\/(\d+)\//);
  }

  function storeId(app) {
    var cached = cachedStore(app);
    return (
      app.storeId ||
      (cached && cached[1]) ||
      (/^\d+$/.test(app.id) && app.id) ||
      A.catalog.artworkStoreId(app) ||
      learned[app.id] ||
      null
    );
  }

  function sources(app) {
    if (!A.tizen) {
      return [];
    }
    var result = [];
    function add(src) {
      if (typeof src === "string" && src && result.indexOf(src) < 0) {
        result.push(src);
      }
    }
    var cached = cachedStore(app);
    var store = storeId(app);
    if (/^\d+$/.test(store)) {
      add(ICON_CACHE + "/" + store + "/304x304.png");
      add("/opt/share/webappservice/apps_icon/FirstScreen/" + store + "/250x250.png");
    }
    if (cached) {
      add(app.icon);
    }
    return result;
  }

  // Names differ in small ways between the app list and the local API ("ZEE5" and "Zee 5").
  function nameKey(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/ - .*/, "")
      .replace(/[^a-z0-9]/g, "");
  }

  // Samsung keeps each store app's artwork in a folder named after its store ID. For apps the catalogue
  // doesn't know, such as ones just installed from the store, ask the TV's local API which app each
  // unclaimed folder belongs to, and remember the answer. `done` runs only when something was learned.
  function learn(apps, done) {
    var tz = A.tizen;
    if (learning || !tz || !tz.filesystem || typeof tz.filesystem.listDirectory !== "function") {
      return;
    }
    var missing = Object.create(null),
      claimed = Object.create(null);
    apps.forEach(function (app) {
      var store = storeId(app);
      if (store) {
        claimed[store] = true;
      } else if (nameKey(app.name)) {
        missing[nameKey(app.name)] = app.id;
      }
    });
    if (!Object.keys(missing).length) {
      return;
    }
    learning = true;
    function finish(changed) {
      learning = false;
      if (changed) {
        saveLearned();
        done();
      }
    }
    try {
      tz.filesystem.listDirectory(
        ICON_CACHE,
        function (names) {
          var queue = names.filter(function (name) {
            return /^\d+$/.test(name) && !claimed[name] && !checked[name];
          });
          var changed = false;
          (function next() {
            var id = queue.shift();
            if (!id) {
              finish(changed);
              return;
            }
            checked[id] = true;
            var request = new XMLHttpRequest();
            request.open("GET", A.config.TV_API_URL + "/api/v2/applications/" + id);
            request.timeout = 2000;
            request.onload = function () {
              try {
                var appId = missing[nameKey(JSON.parse(request.responseText).name)];
                if (appId && !learned[appId]) {
                  learned[appId] = id;
                  changed = true;
                }
              } catch (e) {
                /* not an app the launcher lists */
              }
              next();
            };
            request.onerror = request.ontimeout = next;
            request.send();
          })();
        },
        function () {
          finish(false);
        }
      );
    } catch (e) {
      finish(false);
    }
  }

  A.artwork = { sources: sources, learn: learn };
})(window.AeroTizen);
