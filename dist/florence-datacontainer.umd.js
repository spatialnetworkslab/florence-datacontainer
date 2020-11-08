(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global['florence-datacontainer'] = factory());
}(this, function () { 'use strict';

  var obj;
  var NOTHING = typeof Symbol !== "undefined" ? Symbol("immer-nothing") : ( obj = {}, obj["immer-nothing"] = true, obj );
  var DRAFTABLE = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("immer-draftable") : "__$immer_draftable";
  var DRAFT_STATE = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("immer-state") : "__$immer_state";
  function isDraft(value) {
    return !!value && !!value[DRAFT_STATE];
  }
  function isDraftable(value) {
    if (!value) { return false; }
    return isPlainObject(value) || !!value[DRAFTABLE] || !!value.constructor[DRAFTABLE];
  }
  function isPlainObject(value) {
    if (!value || typeof value !== "object") { return false; }
    if (Array.isArray(value)) { return true; }
    var proto = Object.getPrototypeOf(value);
    return !proto || proto === Object.prototype;
  }
  var assign = Object.assign || function assign(target, value) {
    for (var key in value) {
      if (has(value, key)) {
        target[key] = value[key];
      }
    }

    return target;
  };
  var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : typeof Object.getOwnPropertySymbols !== "undefined" ? function (obj) { return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj)); } : Object.getOwnPropertyNames;
  function shallowCopy(base, invokeGetters) {
    if ( invokeGetters === void 0 ) invokeGetters = false;

    if (Array.isArray(base)) { return base.slice(); }
    var clone = Object.create(Object.getPrototypeOf(base));
    ownKeys(base).forEach(function (key) {
      if (key === DRAFT_STATE) {
        return; // Never copy over draft state.
      }

      var desc = Object.getOwnPropertyDescriptor(base, key);
      var value = desc.value;

      if (desc.get) {
        if (!invokeGetters) {
          throw new Error("Immer drafts cannot have computed properties");
        }

        value = desc.get.call(base);
      }

      if (desc.enumerable) {
        clone[key] = value;
      } else {
        Object.defineProperty(clone, key, {
          value: value,
          writable: true,
          configurable: true
        });
      }
    });
    return clone;
  }
  function each(value, cb) {
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) { cb(i, value[i], value); }
    } else {
      ownKeys(value).forEach(function (key) { return cb(key, value[key], value); });
    }
  }
  function isEnumerable(base, prop) {
    var desc = Object.getOwnPropertyDescriptor(base, prop);
    return !!desc && desc.enumerable;
  }
  function has(thing, prop) {
    return Object.prototype.hasOwnProperty.call(thing, prop);
  }
  function is(x, y) {
    // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    } else {
      return x !== x && y !== y;
    }
  }
  function clone(obj) {
    if (!isDraftable(obj)) { return obj; }
    if (Array.isArray(obj)) { return obj.map(clone); }
    var cloned = Object.create(Object.getPrototypeOf(obj));

    for (var key in obj) { cloned[key] = clone(obj[key]); }

    return cloned;
  }
  function deepFreeze(obj) {
    if (!isDraftable(obj) || isDraft(obj) || Object.isFrozen(obj)) { return; }
    Object.freeze(obj);
    if (Array.isArray(obj)) { obj.forEach(deepFreeze); }else { for (var key in obj) { deepFreeze(obj[key]); } }
  }

  /** Each scope represents a `produce` call. */

  var ImmerScope = function ImmerScope(parent) {
    this.drafts = [];
    this.parent = parent; // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.

    this.canAutoFreeze = true; // To avoid prototype lookups:

    this.patches = null;
  };

  ImmerScope.prototype.usePatches = function usePatches (patchListener) {
    if (patchListener) {
      this.patches = [];
      this.inversePatches = [];
      this.patchListener = patchListener;
    }
  };

  ImmerScope.prototype.revoke = function revoke$1 () {
    this.leave();
    this.drafts.forEach(revoke);
    this.drafts = null; // Make draft-related methods throw.
  };

  ImmerScope.prototype.leave = function leave () {
    if (this === ImmerScope.current) {
      ImmerScope.current = this.parent;
    }
  };
  ImmerScope.current = null;

  ImmerScope.enter = function () {
    return this.current = new ImmerScope(this.current);
  };

  function revoke(draft) {
    draft[DRAFT_STATE].revoke();
  }

  // but share them all instead

  var descriptors = {};
  function willFinalize(scope, result, isReplaced) {
    scope.drafts.forEach(function (draft) {
      draft[DRAFT_STATE].finalizing = true;
    });

    if (!isReplaced) {
      if (scope.patches) {
        markChangesRecursively(scope.drafts[0]);
      } // This is faster when we don't care about which attributes changed.


      markChangesSweep(scope.drafts);
    } // When a child draft is returned, look for changes.
    else if (isDraft(result) && result[DRAFT_STATE].scope === scope) {
        markChangesSweep(scope.drafts);
      }
  }
  function createProxy(base, parent) {
    var isArray = Array.isArray(base);
    var draft = clonePotentialDraft(base);
    each(draft, function (prop) {
      proxyProperty(draft, prop, isArray || isEnumerable(base, prop));
    }); // See "proxy.js" for property documentation.

    var scope = parent ? parent.scope : ImmerScope.current;
    var state = {
      scope: scope,
      modified: false,
      finalizing: false,
      // es5 only
      finalized: false,
      assigned: {},
      parent: parent,
      base: base,
      draft: draft,
      copy: null,
      revoke: revoke$1,
      revoked: false // es5 only

    };
    createHiddenProperty(draft, DRAFT_STATE, state);
    scope.drafts.push(draft);
    return draft;
  }

  function revoke$1() {
    this.revoked = true;
  }

  function source(state) {
    return state.copy || state.base;
  } // Access a property without creating an Immer draft.


  function peek(draft, prop) {
    var state = draft[DRAFT_STATE];

    if (state && !state.finalizing) {
      state.finalizing = true;
      var value = draft[prop];
      state.finalizing = false;
      return value;
    }

    return draft[prop];
  }

  function get(state, prop) {
    assertUnrevoked(state);
    var value = peek(source(state), prop);
    if (state.finalizing) { return value; } // Create a draft if the value is unmodified.

    if (value === peek(state.base, prop) && isDraftable(value)) {
      prepareCopy(state);
      return state.copy[prop] = createProxy(value, state);
    }

    return value;
  }

  function set(state, prop, value) {
    assertUnrevoked(state);
    state.assigned[prop] = true;

    if (!state.modified) {
      if (is(value, peek(source(state), prop))) { return; }
      markChanged(state);
      prepareCopy(state);
    }

    state.copy[prop] = value;
  }

  function markChanged(state) {
    if (!state.modified) {
      state.modified = true;
      if (state.parent) { markChanged(state.parent); }
    }
  }

  function prepareCopy(state) {
    if (!state.copy) { state.copy = clonePotentialDraft(state.base); }
  }

  function clonePotentialDraft(base) {
    var state = base && base[DRAFT_STATE];

    if (state) {
      state.finalizing = true;
      var draft = shallowCopy(state.draft, true);
      state.finalizing = false;
      return draft;
    }

    return shallowCopy(base);
  }

  function proxyProperty(draft, prop, enumerable) {
    var desc = descriptors[prop];

    if (desc) {
      desc.enumerable = enumerable;
    } else {
      descriptors[prop] = desc = {
        configurable: true,
        enumerable: enumerable,

        get: function get$1() {
          return get(this[DRAFT_STATE], prop);
        },

        set: function set$1(value) {
          set(this[DRAFT_STATE], prop, value);
        }

      };
    }

    Object.defineProperty(draft, prop, desc);
  }

  function assertUnrevoked(state) {
    if (state.revoked === true) { throw new Error("Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + JSON.stringify(source(state))); }
  } // This looks expensive, but only proxies are visited, and only objects without known changes are scanned.


  function markChangesSweep(drafts) {
    // The natural order of drafts in the `scope` array is based on when they
    // were accessed. By processing drafts in reverse natural order, we have a
    // better chance of processing leaf nodes first. When a leaf node is known to
    // have changed, we can avoid any traversal of its ancestor nodes.
    for (var i = drafts.length - 1; i >= 0; i--) {
      var state = drafts[i][DRAFT_STATE];

      if (!state.modified) {
        if (Array.isArray(state.base)) {
          if (hasArrayChanges(state)) { markChanged(state); }
        } else if (hasObjectChanges(state)) { markChanged(state); }
      }
    }
  }

  function markChangesRecursively(object) {
    if (!object || typeof object !== "object") { return; }
    var state = object[DRAFT_STATE];
    if (!state) { return; }
    var base = state.base;
    var draft = state.draft;
    var assigned = state.assigned;

    if (!Array.isArray(object)) {
      // Look for added keys.
      Object.keys(draft).forEach(function (key) {
        // The `undefined` check is a fast path for pre-existing keys.
        if (base[key] === undefined && !has(base, key)) {
          assigned[key] = true;
          markChanged(state);
        } else if (!assigned[key]) {
          // Only untouched properties trigger recursion.
          markChangesRecursively(draft[key]);
        }
      }); // Look for removed keys.

      Object.keys(base).forEach(function (key) {
        // The `undefined` check is a fast path for pre-existing keys.
        if (draft[key] === undefined && !has(draft, key)) {
          assigned[key] = false;
          markChanged(state);
        }
      });
    } else if (hasArrayChanges(state)) {
      markChanged(state);
      assigned.length = true;

      if (draft.length < base.length) {
        for (var i = draft.length; i < base.length; i++) { assigned[i] = false; }
      } else {
        for (var i$1 = base.length; i$1 < draft.length; i$1++) { assigned[i$1] = true; }
      }

      for (var i$2 = 0; i$2 < draft.length; i$2++) {
        // Only untouched indices trigger recursion.
        if (assigned[i$2] === undefined) { markChangesRecursively(draft[i$2]); }
      }
    }
  }

  function hasObjectChanges(state) {
    var base = state.base;
    var draft = state.draft; // Search for added keys and changed keys. Start at the back, because
    // non-numeric keys are ordered by time of definition on the object.

    var keys = Object.keys(draft);

    for (var i = keys.length - 1; i >= 0; i--) {
      var key = keys[i];
      var baseValue = base[key]; // The `undefined` check is a fast path for pre-existing keys.

      if (baseValue === undefined && !has(base, key)) {
        return true;
      } // Once a base key is deleted, future changes go undetected, because its
      // descriptor is erased. This branch detects any missed changes.
      else {
          var value = draft[key];
          var state$1 = value && value[DRAFT_STATE];

          if (state$1 ? state$1.base !== baseValue : !is(value, baseValue)) {
            return true;
          }
        }
    } // At this point, no keys were added or changed.
    // Compare key count to determine if keys were deleted.


    return keys.length !== Object.keys(base).length;
  }

  function hasArrayChanges(state) {
    var draft = state.draft;
    if (draft.length !== state.base.length) { return true; } // See #116
    // If we first shorten the length, our array interceptors will be removed.
    // If after that new items are added, result in the same original length,
    // those last items will have no intercepting property.
    // So if there is no own descriptor on the last position, we know that items were removed and added
    // N.B.: splice, unshift, etc only shift values around, but not prop descriptors, so we only have to check
    // the last one

    var descriptor = Object.getOwnPropertyDescriptor(draft, draft.length - 1); // descriptor can be null, but only for newly created sparse arrays, eg. new Array(10)

    if (descriptor && !descriptor.get) { return true; } // For all other cases, we don't have to compare, as they would have been picked up by the index setters

    return false;
  }

  function createHiddenProperty(target, prop, value) {
    Object.defineProperty(target, prop, {
      value: value,
      enumerable: false,
      writable: true
    });
  }

  var legacyProxy = /*#__PURE__*/Object.freeze({
  	willFinalize: willFinalize,
  	createProxy: createProxy
  });

  function willFinalize$1() {}
  function createProxy$1(base, parent) {
    var scope = parent ? parent.scope : ImmerScope.current;
    var state = {
      // Track which produce call this is associated with.
      scope: scope,
      // True for both shallow and deep changes.
      modified: false,
      // Used during finalization.
      finalized: false,
      // Track which properties have been assigned (true) or deleted (false).
      assigned: {},
      // The parent draft state.
      parent: parent,
      // The base state.
      base: base,
      // The base proxy.
      draft: null,
      // Any property proxies.
      drafts: {},
      // The base copy with any updated values.
      copy: null,
      // Called by the `produce` function.
      revoke: null
    };
    var ref = Array.isArray(base) ? // [state] is used for arrays, to make sure the proxy is array-ish and not violate invariants,
    // although state itself is an object
    Proxy.revocable([state], arrayTraps) : Proxy.revocable(state, objectTraps);
    var revoke = ref.revoke;
    var proxy = ref.proxy;
    state.draft = proxy;
    state.revoke = revoke;
    scope.drafts.push(proxy);
    return proxy;
  }
  var objectTraps = {
    get: get$1,

    has: function has(target, prop) {
      return prop in source$1(target);
    },

    ownKeys: function ownKeys(target) {
      return Reflect.ownKeys(source$1(target));
    },

    set: set$1,
    deleteProperty: deleteProperty,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor,

    defineProperty: function defineProperty() {
      throw new Error("Object.defineProperty() cannot be used on an Immer draft"); // prettier-ignore
    },

    getPrototypeOf: function getPrototypeOf(target) {
      return Object.getPrototypeOf(target.base);
    },

    setPrototypeOf: function setPrototypeOf() {
      throw new Error("Object.setPrototypeOf() cannot be used on an Immer draft"); // prettier-ignore
    }

  };
  var arrayTraps = {};
  each(objectTraps, function (key, fn) {
    arrayTraps[key] = function () {
      arguments[0] = arguments[0][0];
      return fn.apply(this, arguments);
    };
  });

  arrayTraps.deleteProperty = function (state, prop) {
    if (isNaN(parseInt(prop))) {
      throw new Error("Immer only supports deleting array indices"); // prettier-ignore
    }

    return objectTraps.deleteProperty.call(this, state[0], prop);
  };

  arrayTraps.set = function (state, prop, value) {
    if (prop !== "length" && isNaN(parseInt(prop))) {
      throw new Error("Immer only supports setting array indices and the 'length' property"); // prettier-ignore
    }

    return objectTraps.set.call(this, state[0], prop, value);
  }; // returns the object we should be reading the current value from, which is base, until some change has been made


  function source$1(state) {
    return state.copy || state.base;
  } // Access a property without creating an Immer draft.


  function peek$1(draft, prop) {
    var state = draft[DRAFT_STATE];
    var desc = Reflect.getOwnPropertyDescriptor(state ? source$1(state) : draft, prop);
    return desc && desc.value;
  }

  function get$1(state, prop) {
    if (prop === DRAFT_STATE) { return state; }
    var drafts = state.drafts; // Check for existing draft in unmodified state.

    if (!state.modified && has(drafts, prop)) {
      return drafts[prop];
    }

    var value = source$1(state)[prop];

    if (state.finalized || !isDraftable(value)) {
      return value;
    } // Check for existing draft in modified state.


    if (state.modified) {
      // Assigned values are never drafted. This catches any drafts we created, too.
      if (value !== peek$1(state.base, prop)) { return value; } // Store drafts on the copy (when one exists).

      drafts = state.copy;
    }

    return drafts[prop] = createProxy$1(value, state);
  }

  function set$1(state, prop, value) {
    if (!state.modified) {
      var baseValue = peek$1(state.base, prop); // Optimize based on value's truthiness. Truthy values are guaranteed to
      // never be undefined, so we can avoid the `in` operator. Lastly, truthy
      // values may be drafts, but falsy values are never drafts.

      var isUnchanged = value ? is(baseValue, value) || value === state.drafts[prop] : is(baseValue, value) && prop in state.base;
      if (isUnchanged) { return true; }
      markChanged$1(state);
    }

    state.assigned[prop] = true;
    state.copy[prop] = value;
    return true;
  }

  function deleteProperty(state, prop) {
    // The `undefined` check is a fast path for pre-existing keys.
    if (peek$1(state.base, prop) !== undefined || prop in state.base) {
      state.assigned[prop] = false;
      markChanged$1(state);
    } else if (state.assigned[prop]) {
      // if an originally not assigned property was deleted
      delete state.assigned[prop];
    }

    if (state.copy) { delete state.copy[prop]; }
    return true;
  } // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.


  function getOwnPropertyDescriptor(state, prop) {
    var owner = source$1(state);
    var desc = Reflect.getOwnPropertyDescriptor(owner, prop);

    if (desc) {
      desc.writable = true;
      desc.configurable = !Array.isArray(owner) || prop !== "length";
    }

    return desc;
  }

  function markChanged$1(state) {
    if (!state.modified) {
      state.modified = true;
      state.copy = assign(shallowCopy(state.base), state.drafts);
      state.drafts = null;
      if (state.parent) { markChanged$1(state.parent); }
    }
  }

  var modernProxy = /*#__PURE__*/Object.freeze({
  	willFinalize: willFinalize$1,
  	createProxy: createProxy$1
  });

  function generatePatches(state, basePath, patches, inversePatches) {
    Array.isArray(state.base) ? generateArrayPatches(state, basePath, patches, inversePatches) : generateObjectPatches(state, basePath, patches, inversePatches);
  }

  function generateArrayPatches(state, basePath, patches, inversePatches) {
    var assign, assign$1;

    var base = state.base;
    var copy = state.copy;
    var assigned = state.assigned; // Reduce complexity by ensuring `base` is never longer.

    if (copy.length < base.length) {
      (assign = [copy, base], base = assign[0], copy = assign[1]);
      (assign$1 = [inversePatches, patches], patches = assign$1[0], inversePatches = assign$1[1]);
    }

    var delta = copy.length - base.length; // Find the first replaced index.

    var start = 0;

    while (base[start] === copy[start] && start < base.length) {
      ++start;
    } // Find the last replaced index. Search from the end to optimize splice patches.


    var end = base.length;

    while (end > start && base[end - 1] === copy[end + delta - 1]) {
      --end;
    } // Process replaced indices.


    for (var i = start; i < end; ++i) {
      if (assigned[i] && copy[i] !== base[i]) {
        var path = basePath.concat([i]);
        patches.push({
          op: "replace",
          path: path,
          value: copy[i]
        });
        inversePatches.push({
          op: "replace",
          path: path,
          value: base[i]
        });
      }
    }

    var replaceCount = patches.length; // Process added indices.

    for (var i$1 = end + delta - 1; i$1 >= end; --i$1) {
      var path$1 = basePath.concat([i$1]);
      patches[replaceCount + i$1 - end] = {
        op: "add",
        path: path$1,
        value: copy[i$1]
      };
      inversePatches.push({
        op: "remove",
        path: path$1
      });
    }
  }

  function generateObjectPatches(state, basePath, patches, inversePatches) {
    var base = state.base;
    var copy = state.copy;
    each(state.assigned, function (key, assignedValue) {
      var origValue = base[key];
      var value = copy[key];
      var op = !assignedValue ? "remove" : key in base ? "replace" : "add";
      if (origValue === value && op === "replace") { return; }
      var path = basePath.concat(key);
      patches.push(op === "remove" ? {
        op: op,
        path: path
      } : {
        op: op,
        path: path,
        value: value
      });
      inversePatches.push(op === "add" ? {
        op: "remove",
        path: path
      } : op === "remove" ? {
        op: "add",
        path: path,
        value: origValue
      } : {
        op: "replace",
        path: path,
        value: origValue
      });
    });
  }

  var applyPatches = function (draft, patches) {
    for (var i$1 = 0, list = patches; i$1 < list.length; i$1 += 1) {
      var patch = list[i$1];

      var path = patch.path;
      var op = patch.op;
      var value = clone(patch.value); // used to clone patch to ensure original patch is not modified, see #411

      if (!path.length) { throw new Error("Illegal state"); }
      var base = draft;

      for (var i = 0; i < path.length - 1; i++) {
        base = base[path[i]];
        if (!base || typeof base !== "object") { throw new Error("Cannot apply patch, path doesn't resolve: " + path.join("/")); } // prettier-ignore
      }

      var key = path[path.length - 1];

      switch (op) {
        case "replace":
          // if value is an object, then it's assigned by reference
          // in the following add or remove ops, the value field inside the patch will also be modifyed
          // so we use value from the cloned patch
          base[key] = value;
          break;

        case "add":
          if (Array.isArray(base)) {
            // TODO: support "foo/-" paths for appending to an array
            base.splice(key, 0, value);
          } else {
            base[key] = value;
          }

          break;

        case "remove":
          if (Array.isArray(base)) {
            base.splice(key, 1);
          } else {
            delete base[key];
          }

          break;

        default:
          throw new Error("Unsupported patch operation: " + op);
      }
    }

    return draft;
  };

  function verifyMinified() {}

  var configDefaults = {
    useProxies: typeof Proxy !== "undefined" && typeof Reflect !== "undefined",
    autoFreeze: typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : verifyMinified.name === "verifyMinified",
    onAssign: null,
    onDelete: null,
    onCopy: null
  };
  var Immer = function Immer(config) {
    assign(this, configDefaults, config);
    this.setUseProxies(this.useProxies);
    this.produce = this.produce.bind(this);
  };

  Immer.prototype.produce = function produce (base, recipe, patchListener) {
      var this$1 = this;

    // curried invocation
    if (typeof base === "function" && typeof recipe !== "function") {
      var defaultBase = recipe;
      recipe = base;
      var self = this;
      return function curriedProduce(base) {
          var this$1 = this;
          if ( base === void 0 ) base = defaultBase;
          var args = [], len = arguments.length - 1;
          while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

        return self.produce(base, function (draft) { return recipe.call.apply(recipe, [ this$1, draft ].concat( args )); }); // prettier-ignore
      };
    } // prettier-ignore


    {
      if (typeof recipe !== "function") {
        throw new Error("The first or second argument to `produce` must be a function");
      }

      if (patchListener !== undefined && typeof patchListener !== "function") {
        throw new Error("The third argument to `produce` must be a function or undefined");
      }
    }
    var result; // Only plain objects, arrays, and "immerable classes" are drafted.

    if (isDraftable(base)) {
      var scope = ImmerScope.enter();
      var proxy = this.createProxy(base);
      var hasError = true;

      try {
        result = recipe(proxy);
        hasError = false;
      } finally {
        // finally instead of catch + rethrow better preserves original stack
        if (hasError) { scope.revoke(); }else { scope.leave(); }
      }

      if (result instanceof Promise) {
        return result.then(function (result) {
          scope.usePatches(patchListener);
          return this$1.processResult(result, scope);
        }, function (error) {
          scope.revoke();
          throw error;
        });
      }

      scope.usePatches(patchListener);
      return this.processResult(result, scope);
    } else {
      result = recipe(base);
      if (result === NOTHING) { return undefined; }
      if (result === undefined) { result = base; }
      this.maybeFreeze(result, true);
      return result;
    }
  };

  Immer.prototype.produceWithPatches = function produceWithPatches (arg1, arg2, arg3) {
      var this$1 = this;

    if (typeof arg1 === "function") {
      return function (state) {
          var args = [], len = arguments.length - 1;
          while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

          return this$1.produceWithPatches(state, function (draft) { return arg1.apply(void 0, [ draft ].concat( args )); });
        };
    } // non-curried form


    if (arg3) { throw new Error("A patch listener cannot be passed to produceWithPatches"); }
    var patches, inversePatches;
    var nextState = this.produce(arg1, arg2, function (p, ip) {
      patches = p;
      inversePatches = ip;
    });
    return [nextState, patches, inversePatches];
  };

  Immer.prototype.createDraft = function createDraft (base) {
    if (!isDraftable(base)) {
      throw new Error("First argument to `createDraft` must be a plain object, an array, or an immerable object"); // prettier-ignore
    }

    var scope = ImmerScope.enter();
    var proxy = this.createProxy(base);
    proxy[DRAFT_STATE].isManual = true;
    scope.leave();
    return proxy;
  };

  Immer.prototype.finishDraft = function finishDraft (draft, patchListener) {
    var state = draft && draft[DRAFT_STATE];

    if (!state || !state.isManual) {
      throw new Error("First argument to `finishDraft` must be a draft returned by `createDraft`"); // prettier-ignore
    }

    if (state.finalized) {
      throw new Error("The given draft is already finalized"); // prettier-ignore
    }

    var scope = state.scope;
    scope.usePatches(patchListener);
    return this.processResult(undefined, scope);
  };

  Immer.prototype.setAutoFreeze = function setAutoFreeze (value) {
    this.autoFreeze = value;
  };

  Immer.prototype.setUseProxies = function setUseProxies (value) {
    this.useProxies = value;
    assign(this, value ? modernProxy : legacyProxy);
  };

  Immer.prototype.applyPatches = function applyPatches$1 (base, patches) {
    // If a patch replaces the entire state, take that replacement as base
    // before applying patches
    var i;

    for (i = patches.length - 1; i >= 0; i--) {
      var patch = patches[i];

      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }

    if (isDraft(base)) {
      // N.B: never hits if some patch a replacement, patches are never drafts
      return applyPatches(base, patches);
    } // Otherwise, produce a copy of the base state.


    return this.produce(base, function (draft) { return applyPatches(draft, patches.slice(i + 1)); });
  };
  /** @internal */


  Immer.prototype.processResult = function processResult (result, scope) {
    var baseDraft = scope.drafts[0];
    var isReplaced = result !== undefined && result !== baseDraft;
    this.willFinalize(scope, result, isReplaced);

    if (isReplaced) {
      if (baseDraft[DRAFT_STATE].modified) {
        scope.revoke();
        throw new Error("An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft."); // prettier-ignore
      }

      if (isDraftable(result)) {
        // Finalize the result in case it contains (or is) a subset of the draft.
        result = this.finalize(result, null, scope);
        this.maybeFreeze(result);
      }

      if (scope.patches) {
        scope.patches.push({
          op: "replace",
          path: [],
          value: result
        });
        scope.inversePatches.push({
          op: "replace",
          path: [],
          value: baseDraft[DRAFT_STATE].base
        });
      }
    } else {
      // Finalize the base draft.
      result = this.finalize(baseDraft, [], scope);
    }

    scope.revoke();

    if (scope.patches) {
      scope.patchListener(scope.patches, scope.inversePatches);
    }

    return result !== NOTHING ? result : undefined;
  };
  /**
   * @internal
   * Finalize a draft, returning either the unmodified base state or a modified
   * copy of the base state.
   */


  Immer.prototype.finalize = function finalize (draft, path, scope) {
      var this$1 = this;

    var state = draft[DRAFT_STATE];

    if (!state) {
      if (Object.isFrozen(draft)) { return draft; }
      return this.finalizeTree(draft, null, scope);
    } // Never finalize drafts owned by another scope.


    if (state.scope !== scope) {
      return draft;
    }

    if (!state.modified) {
      this.maybeFreeze(state.base, true);
      return state.base;
    }

    if (!state.finalized) {
      state.finalized = true;
      this.finalizeTree(state.draft, path, scope);

      if (this.onDelete) {
        // The `assigned` object is unreliable with ES5 drafts.
        if (this.useProxies) {
          var assigned = state.assigned;

          for (var prop in assigned) {
            if (!assigned[prop]) { this.onDelete(state, prop); }
          }
        } else {
          var base = state.base;
            var copy = state.copy;
          each(base, function (prop) {
            if (!has(copy, prop)) { this$1.onDelete(state, prop); }
          });
        }
      }

      if (this.onCopy) {
        this.onCopy(state);
      } // At this point, all descendants of `state.copy` have been finalized,
      // so we can be sure that `scope.canAutoFreeze` is accurate.


      if (this.autoFreeze && scope.canAutoFreeze) {
        Object.freeze(state.copy);
      }

      if (path && scope.patches) {
        generatePatches(state, path, scope.patches, scope.inversePatches);
      }
    }

    return state.copy;
  };
  /**
   * @internal
   * Finalize all drafts in the given state tree.
   */


  Immer.prototype.finalizeTree = function finalizeTree (root, rootPath, scope) {
      var this$1 = this;

    var state = root[DRAFT_STATE];

    if (state) {
      if (!this.useProxies) {
        // Create the final copy, with added keys and without deleted keys.
        state.copy = shallowCopy(state.draft, true);
      }

      root = state.copy;
    }

    var needPatches = !!rootPath && !!scope.patches;

    var finalizeProperty = function (prop, value, parent) {
      if (value === parent) {
        throw Error("Immer forbids circular references");
      } // In the `finalizeTree` method, only the `root` object may be a draft.


      var isDraftProp = !!state && parent === root;

      if (isDraft(value)) {
        var path = isDraftProp && needPatches && !state.assigned[prop] ? rootPath.concat(prop) : null; // Drafts owned by `scope` are finalized here.

        value = this$1.finalize(value, path, scope); // Drafts from another scope must prevent auto-freezing.

        if (isDraft(value)) {
          scope.canAutoFreeze = false;
        } // Preserve non-enumerable properties.


        if (Array.isArray(parent) || isEnumerable(parent, prop)) {
          parent[prop] = value;
        } else {
          Object.defineProperty(parent, prop, {
            value: value
          });
        } // Unchanged drafts are never passed to the `onAssign` hook.


        if (isDraftProp && value === state.base[prop]) { return; }
      } // Unchanged draft properties are ignored.
      else if (isDraftProp && is(value, state.base[prop])) {
          return;
        } // Search new objects for unfinalized drafts. Frozen objects should never contain drafts.
        else if (isDraftable(value) && !Object.isFrozen(value)) {
            each(value, finalizeProperty);
            this$1.maybeFreeze(value);
          }

      if (isDraftProp && this$1.onAssign) {
        this$1.onAssign(state, prop, value);
      }
    };

    each(root, finalizeProperty);
    return root;
  };

  Immer.prototype.maybeFreeze = function maybeFreeze (value, deep) {
      if ( deep === void 0 ) deep = false;

    if (this.autoFreeze && !isDraft(value)) {
      if (deep) { deepFreeze(value); }else { Object.freeze(value); }
    }
  };

  var immer = new Immer();
  /**
   * The `produce` function takes a value and a "recipe function" (whose
   * return value often depends on the base state). The recipe function is
   * free to mutate its first argument however it wants. All mutations are
   * only ever applied to a __copy__ of the base state.
   *
   * Pass only a function to create a "curried producer" which relieves you
   * from passing the recipe function every time.
   *
   * Only plain objects and arrays are made mutable. All other objects are
   * considered uncopyable.
   *
   * Note: This function is __bound__ to its `Immer` instance.
   *
   * @param {any} base - the initial state
   * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
   * @param {Function} patchListener - optional function that will be called with all the patches produced here
   * @returns {any} a new state, or the initial state if nothing was modified
   */

  var produce = immer.produce;
  /**
   * Like `produce`, but `produceWithPatches` always returns a tuple
   * [nextState, patches, inversePatches] (instead of just the next state)
   */

  var produceWithPatches = immer.produceWithPatches.bind(immer);
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is disabled in production.
   */

  var setAutoFreeze = immer.setAutoFreeze.bind(immer);
  /**
   * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
   * always faster than using ES5 proxies.
   *
   * By default, feature detection is used, so calling this is rarely necessary.
   */

  var setUseProxies = immer.setUseProxies.bind(immer);
  /**
   * Apply an array of Immer patches to the first argument.
   *
   * This function is a producer, which means copy-on-write is in effect.
   */

  var applyPatches$1 = immer.applyPatches.bind(immer);
  /**
   * Create an Immer draft from the given base state, which may be a draft itself.
   * The draft can be modified until you finalize it with the `finishDraft` function.
   */

  var createDraft = immer.createDraft.bind(immer);
  /**
   * Finalize an Immer draft from a `createDraft` call, returning the base state
   * (if no changes were made) or a modified copy. The draft must *not* be
   * mutated afterwards.
   *
   * Pass a function as the 2nd argument to generate Immer patches based on the
   * changes that were made.
   */

  var finishDraft = immer.finishDraft.bind(immer);

  function isColumnOriented (data) {
    if (data.constructor === Object) {
      const columns = Object.keys(data).map(key => data[key]);
      return columns.every(column => column.constructor === Array)
    }

    return false
  }

  function isRowOriented (data) {
    if (data.constructor === Array) {
      return data.every(row => row.constructor === Object)
    }

    return false
  }

  function isGeoJSON (data) {
    const hasCorrectType = data.type === 'FeatureCollection';
    const hasCorrectFeatures = data.features && data.features.length > 0;

    return hasCorrectType && hasCorrectFeatures
  }

  function checkFormatColumnData (data) {
    checkFormat(data, checkRegularColumnName);
  }

  function checkFormatInternal (data) {
    checkFormat(data, checkInternalDataColumnName);
  }

  function checkFormat (data, columnNameChecker) {
    let dataLength = null;

    for (const columnName in data) {
      columnNameChecker(columnName);
      const column = data[columnName];

      dataLength = dataLength || column.length;

      if (dataLength === 0) {
        throw new Error('Invalid data: columns cannot be empty')
      }

      if (dataLength !== column.length) {
        throw new Error('Invalid data: columns must be of same length')
      }
    }
  }

  function checkRegularColumnName (columnName) {
    if (columnName.match(forbiddenChars)) {
      throw new Error(`Invalid column name '${columnName}': '$' and '/' are not allowed'`)
    }
  }

  const forbiddenChars = /[/$]/;

  function checkInternalDataColumnName (columnName) {
    if (!['$key', '$geometry', '$grouped'].includes(columnName)) {
      checkRegularColumnName(columnName);
    }
  }

  // Adds floating point numbers with twice the normal precision.
  // Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
  // Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
  // 305–363 (1997).
  // Code adapted from GeographicLib by Charles F. F. Karney,
  // http://geographiclib.sourceforge.net/

  function adder() {
    return new Adder;
  }

  function Adder() {
    this.reset();
  }

  Adder.prototype = {
    constructor: Adder,
    reset: function() {
      this.s = // rounded value
      this.t = 0; // exact error
    },
    add: function(y) {
      add(temp, y, this.t);
      add(this, temp.s, this.s);
      if (this.s) this.t += temp.t;
      else this.s = temp.t;
    },
    valueOf: function() {
      return this.s;
    }
  };

  var temp = new Adder;

  function add(adder, a, b) {
    var x = adder.s = a + b,
        bv = x - a,
        av = x - bv;
    adder.t = (a - av) + (b - bv);
  }

  var pi = Math.PI;
  var tau = pi * 2;

  var abs = Math.abs;
  var sqrt = Math.sqrt;

  function noop() {}

  function streamGeometry(geometry, stream) {
    if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
      streamGeometryType[geometry.type](geometry, stream);
    }
  }

  var streamObjectType = {
    Feature: function(object, stream) {
      streamGeometry(object.geometry, stream);
    },
    FeatureCollection: function(object, stream) {
      var features = object.features, i = -1, n = features.length;
      while (++i < n) streamGeometry(features[i].geometry, stream);
    }
  };

  var streamGeometryType = {
    Sphere: function(object, stream) {
      stream.sphere();
    },
    Point: function(object, stream) {
      object = object.coordinates;
      stream.point(object[0], object[1], object[2]);
    },
    MultiPoint: function(object, stream) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) object = coordinates[i], stream.point(object[0], object[1], object[2]);
    },
    LineString: function(object, stream) {
      streamLine(object.coordinates, stream, 0);
    },
    MultiLineString: function(object, stream) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) streamLine(coordinates[i], stream, 0);
    },
    Polygon: function(object, stream) {
      streamPolygon(object.coordinates, stream);
    },
    MultiPolygon: function(object, stream) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) streamPolygon(coordinates[i], stream);
    },
    GeometryCollection: function(object, stream) {
      var geometries = object.geometries, i = -1, n = geometries.length;
      while (++i < n) streamGeometry(geometries[i], stream);
    }
  };

  function streamLine(coordinates, stream, closed) {
    var i = -1, n = coordinates.length - closed, coordinate;
    stream.lineStart();
    while (++i < n) coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
    stream.lineEnd();
  }

  function streamPolygon(coordinates, stream) {
    var i = -1, n = coordinates.length;
    stream.polygonStart();
    while (++i < n) streamLine(coordinates[i], stream, 1);
    stream.polygonEnd();
  }

  function geoStream(object, stream) {
    if (object && streamObjectType.hasOwnProperty(object.type)) {
      streamObjectType[object.type](object, stream);
    } else {
      streamGeometry(object, stream);
    }
  }

  var areaRingSum = adder();

  var areaSum = adder();

  var deltaSum = adder();

  var sum = adder();

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending);

  var lengthSum = adder();

  function identity(x) {
    return x;
  }

  var areaSum$1 = adder(),
      areaRingSum$1 = adder(),
      x00,
      y00,
      x0,
      y0;

  var areaStream = {
    point: noop,
    lineStart: noop,
    lineEnd: noop,
    polygonStart: function() {
      areaStream.lineStart = areaRingStart;
      areaStream.lineEnd = areaRingEnd;
    },
    polygonEnd: function() {
      areaStream.lineStart = areaStream.lineEnd = areaStream.point = noop;
      areaSum$1.add(abs(areaRingSum$1));
      areaRingSum$1.reset();
    },
    result: function() {
      var area = areaSum$1 / 2;
      areaSum$1.reset();
      return area;
    }
  };

  function areaRingStart() {
    areaStream.point = areaPointFirst;
  }

  function areaPointFirst(x, y) {
    areaStream.point = areaPoint;
    x00 = x0 = x, y00 = y0 = y;
  }

  function areaPoint(x, y) {
    areaRingSum$1.add(y0 * x - x0 * y);
    x0 = x, y0 = y;
  }

  function areaRingEnd() {
    areaPoint(x00, y00);
  }

  var x0$1 = Infinity,
      y0$1 = x0$1,
      x1 = -x0$1,
      y1 = x1;

  var boundsStream = {
    point: boundsPoint,
    lineStart: noop,
    lineEnd: noop,
    polygonStart: noop,
    polygonEnd: noop,
    result: function() {
      var bounds = [[x0$1, y0$1], [x1, y1]];
      x1 = y1 = -(y0$1 = x0$1 = Infinity);
      return bounds;
    }
  };

  function boundsPoint(x, y) {
    if (x < x0$1) x0$1 = x;
    if (x > x1) x1 = x;
    if (y < y0$1) y0$1 = y;
    if (y > y1) y1 = y;
  }

  // TODO Enforce positive area for exterior, negative area for interior?

  var X0 = 0,
      Y0 = 0,
      Z0 = 0,
      X1 = 0,
      Y1 = 0,
      Z1 = 0,
      X2 = 0,
      Y2 = 0,
      Z2 = 0,
      x00$1,
      y00$1,
      x0$2,
      y0$2;

  var centroidStream = {
    point: centroidPoint,
    lineStart: centroidLineStart,
    lineEnd: centroidLineEnd,
    polygonStart: function() {
      centroidStream.lineStart = centroidRingStart;
      centroidStream.lineEnd = centroidRingEnd;
    },
    polygonEnd: function() {
      centroidStream.point = centroidPoint;
      centroidStream.lineStart = centroidLineStart;
      centroidStream.lineEnd = centroidLineEnd;
    },
    result: function() {
      var centroid = Z2 ? [X2 / Z2, Y2 / Z2]
          : Z1 ? [X1 / Z1, Y1 / Z1]
          : Z0 ? [X0 / Z0, Y0 / Z0]
          : [NaN, NaN];
      X0 = Y0 = Z0 =
      X1 = Y1 = Z1 =
      X2 = Y2 = Z2 = 0;
      return centroid;
    }
  };

  function centroidPoint(x, y) {
    X0 += x;
    Y0 += y;
    ++Z0;
  }

  function centroidLineStart() {
    centroidStream.point = centroidPointFirstLine;
  }

  function centroidPointFirstLine(x, y) {
    centroidStream.point = centroidPointLine;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function centroidPointLine(x, y) {
    var dx = x - x0$2, dy = y - y0$2, z = sqrt(dx * dx + dy * dy);
    X1 += z * (x0$2 + x) / 2;
    Y1 += z * (y0$2 + y) / 2;
    Z1 += z;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function centroidLineEnd() {
    centroidStream.point = centroidPoint;
  }

  function centroidRingStart() {
    centroidStream.point = centroidPointFirstRing;
  }

  function centroidRingEnd() {
    centroidPointRing(x00$1, y00$1);
  }

  function centroidPointFirstRing(x, y) {
    centroidStream.point = centroidPointRing;
    centroidPoint(x00$1 = x0$2 = x, y00$1 = y0$2 = y);
  }

  function centroidPointRing(x, y) {
    var dx = x - x0$2,
        dy = y - y0$2,
        z = sqrt(dx * dx + dy * dy);

    X1 += z * (x0$2 + x) / 2;
    Y1 += z * (y0$2 + y) / 2;
    Z1 += z;

    z = y0$2 * x - x0$2 * y;
    X2 += z * (x0$2 + x);
    Y2 += z * (y0$2 + y);
    Z2 += z * 3;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function PathContext(context) {
    this._context = context;
  }

  PathContext.prototype = {
    _radius: 4.5,
    pointRadius: function(_) {
      return this._radius = _, this;
    },
    polygonStart: function() {
      this._line = 0;
    },
    polygonEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line === 0) this._context.closePath();
      this._point = NaN;
    },
    point: function(x, y) {
      switch (this._point) {
        case 0: {
          this._context.moveTo(x, y);
          this._point = 1;
          break;
        }
        case 1: {
          this._context.lineTo(x, y);
          break;
        }
        default: {
          this._context.moveTo(x + this._radius, y);
          this._context.arc(x, y, this._radius, 0, tau);
          break;
        }
      }
    },
    result: noop
  };

  var lengthSum$1 = adder(),
      lengthRing,
      x00$2,
      y00$2,
      x0$3,
      y0$3;

  var lengthStream = {
    point: noop,
    lineStart: function() {
      lengthStream.point = lengthPointFirst;
    },
    lineEnd: function() {
      if (lengthRing) lengthPoint(x00$2, y00$2);
      lengthStream.point = noop;
    },
    polygonStart: function() {
      lengthRing = true;
    },
    polygonEnd: function() {
      lengthRing = null;
    },
    result: function() {
      var length = +lengthSum$1;
      lengthSum$1.reset();
      return length;
    }
  };

  function lengthPointFirst(x, y) {
    lengthStream.point = lengthPoint;
    x00$2 = x0$3 = x, y00$2 = y0$3 = y;
  }

  function lengthPoint(x, y) {
    x0$3 -= x, y0$3 -= y;
    lengthSum$1.add(sqrt(x0$3 * x0$3 + y0$3 * y0$3));
    x0$3 = x, y0$3 = y;
  }

  function PathString() {
    this._string = [];
  }

  PathString.prototype = {
    _radius: 4.5,
    _circle: circle(4.5),
    pointRadius: function(_) {
      if ((_ = +_) !== this._radius) this._radius = _, this._circle = null;
      return this;
    },
    polygonStart: function() {
      this._line = 0;
    },
    polygonEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line === 0) this._string.push("Z");
      this._point = NaN;
    },
    point: function(x, y) {
      switch (this._point) {
        case 0: {
          this._string.push("M", x, ",", y);
          this._point = 1;
          break;
        }
        case 1: {
          this._string.push("L", x, ",", y);
          break;
        }
        default: {
          if (this._circle == null) this._circle = circle(this._radius);
          this._string.push("M", x, ",", y, this._circle);
          break;
        }
      }
    },
    result: function() {
      if (this._string.length) {
        var result = this._string.join("");
        this._string = [];
        return result;
      } else {
        return null;
      }
    }
  };

  function circle(radius) {
    return "m0," + radius
        + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius
        + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius
        + "z";
  }

  function geoPath(projection, context) {
    var pointRadius = 4.5,
        projectionStream,
        contextStream;

    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        geoStream(object, projectionStream(contextStream));
      }
      return contextStream.result();
    }

    path.area = function(object) {
      geoStream(object, projectionStream(areaStream));
      return areaStream.result();
    };

    path.measure = function(object) {
      geoStream(object, projectionStream(lengthStream));
      return lengthStream.result();
    };

    path.bounds = function(object) {
      geoStream(object, projectionStream(boundsStream));
      return boundsStream.result();
    };

    path.centroid = function(object) {
      geoStream(object, projectionStream(centroidStream));
      return centroidStream.result();
    };

    path.projection = function(_) {
      return arguments.length ? (projectionStream = _ == null ? (projection = null, identity) : (projection = _).stream, path) : projection;
    };

    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = _ == null ? (context = null, new PathString) : new PathContext(context = _);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return path;
    };

    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };

    return path.projection(projection).context(context);
  }

  function isInvalid (value) {
    if (value === undefined || value === null) { return true }

    if (value.constructor === Number) {
      return !isFinite(value)
    }

    return false
  }

  function isUndefined (value) {
    return value === undefined
  }

  function calculateBBoxGeometries (geometries) {
    let bbox = [[Infinity, Infinity], [-Infinity, -Infinity]];

    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];

      if (!isInvalid(geometry)) {
        bbox = updateBBox(bbox, geometry);
      }
    }

    const bboxObj = {
      x: [bbox[0][0], bbox[1][0]],
      y: [bbox[0][1], bbox[1][1]]
    };

    return bboxObj
  }

  const path = geoPath();

  function updateBBox (bbox, geometry) {
    const newBBox = path.bounds(geometry);

    bbox[0][0] = bbox[0][0] < newBBox[0][0] ? bbox[0][0] : newBBox[0][0];
    bbox[0][1] = bbox[0][1] < newBBox[0][1] ? bbox[0][1] : newBBox[0][1];
    bbox[1][0] = bbox[1][0] > newBBox[1][0] ? bbox[1][0] : newBBox[1][0];
    bbox[1][1] = bbox[1][1] > newBBox[1][1] ? bbox[1][1] : newBBox[1][1];

    return bbox
  }

  function getColumnType (column) {
    const { firstValidValue } = findFirstValidValue(column);
    return getDataType(firstValidValue)
  }

  function getDataType (value) {
    if (isInvalid(value)) return undefined

    if (value.constructor === Number) return 'quantitative'
    if (value.constructor === String) return 'categorical'
    if (value.constructor === Date) return 'temporal'
    if (isInterval(value)) return 'interval'
    if (isGeometry(value)) return 'geometry'
    if (value.constructor === DataContainer) return 'grouped'

    return undefined
  }

  function ensureValidDataType (value) {
    if (isInvalid(getDataType(value))) {
      throw new Error('Invalid data')
    }
  }

  function isGeometry (value) {
    return value.constructor === Object && 'type' in value && 'coordinates' in value
  }

  function isInterval (value) {
    return value.constructor === Array && value.length === 2 && value.every(entry => entry.constructor === Number)
  }

  function warn (message) {
    if (!process) console.warn(message);

    if (process && process.env.NODE_ENV !== 'test') {
      console.warn(message);
    }
  }

  function calculateDomain (column, columnName) {
    if (columnName === '$grouped') {
      throw new Error(`Cannot calculate domain of column '${columnName}'.`)
    }

    const { firstValidValue, nValidValues } = findFirstValidValue(column);

    if (nValidValues === 0) {
      throw new Error(`Cannot calculate domain of column '${column}'. Column contains only missing values.`)
    }

    if (nValidValues > 0) {
      ensureValidDataType(firstValidValue);
      const type = getDataType(firstValidValue);

      if (columnName === '$geometry') {
        return calculateBBoxGeometries(column)
      }

      if (columnName !== '$geometry') {
        return calculateNonGeometryColumnDomain(column, columnName, nValidValues, firstValidValue, type)
      }
    }
  }

  function findFirstValidValue (column) {
    let firstValidValue;
    let nValidValues = 0;

    for (let i = 0; i < column.length; i++) {
      if (!isInvalid(column[i])) {
        nValidValues++;
        firstValidValue = firstValidValue || column[i];
      }

      if (nValidValues > 1) break
    }

    return { firstValidValue, nValidValues }
  }

  function calculateNonGeometryColumnDomain (column, columnName, nValidValues, firstValidValue, type) {
    let domain;
    const nUniqueValues = calculateNumberOfUniqueValues(column, type);

    if (columnHasOnlyOneUniqueValue(nValidValues, nUniqueValues)) {
      domain = calculateDomainForColumnWithOneUniqueValue(
        nValidValues, nUniqueValues, type, firstValidValue, columnName
      );
    } else {
      domain = calculateDomainForRegularColumn(type, column, columnName);
    }

    return domain
  }

  function calculateNumberOfUniqueValues (col, type) {
    const uniqueVals = {};

    if (['quantitative', 'categorical'].includes(type)) {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          uniqueVals[val] = 0;
        }
      }
    }

    if (type === 'temporal') {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          uniqueVals[val.getTime()] = 0;
        }
      }
    }

    if (type === 'interval') {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          const str = JSON.stringify(val);
          uniqueVals[str] = 0;
        }
      }
    }

    return Object.keys(uniqueVals).length
  }

  function columnHasOnlyOneUniqueValue (nValidValues, nUniqueValues) {
    return nValidValues === 1 || nUniqueValues === 1
  }

  function calculateDomainForColumnWithOneUniqueValue (nValidValues, nUniqueValues, type, firstValidValue, columnName) {
    const domain = createDomainForSingleValue(type, firstValidValue);
    const warningText = nValidValues === 1 ? 'valid' : 'unique';

    if (type !== 'categorical') {
      warn(
        `Column '${columnName}' contains only 1 ${warningText} value: ${firstValidValue}.\n` +
        `Using domain ${JSON.stringify(domain)}`
      );
    }

    return domain
  }

  function calculateDomainForRegularColumn (type, column, columnName) {
    let domain = initDomain(type);

    for (let i = 0; i < column.length; i++) {
      const value = column[i];

      if (!isInvalid(value)) {
        if (getDataType(value) !== type) {
          throw new Error(`Invalid column ${columnName}: column contains multiple data types`)
        }

        domain = updateDomain(domain, value, type);
      }
    }

    return domain
  }

  const minUnixTime = new Date(0);
  const maxUnixTime = new Date('19 January 2038');

  function initDomain (type) {
    let domain;
    switch (type) {
      case 'quantitative': {
        domain = [Infinity, -Infinity];
        break
      }
      case 'categorical': {
        domain = [];
        break
      }
      case 'temporal': {
        domain = [maxUnixTime, minUnixTime];
        break
      }
      case 'interval': {
        domain = [Infinity, -Infinity];
        break
      }
    }

    return domain
  }

  function updateDomain (domain, value, type) {
    if (type === 'quantitative') {
      if (domain[0] >= value) { domain[0] = value; }
      if (domain[1] <= value) { domain[1] = value; }
    }

    if (type === 'categorical') {
      if (!domain.includes(value)) { domain.push(value); }
    }

    if (type === 'temporal') {
      const epoch = value.getTime();

      if (domain[0].getTime() >= epoch) { domain[0] = value; }
      if (domain[1].getTime() <= epoch) { domain[1] = value; }
    }

    if (type === 'interval') {
      domain = updateDomain(domain, value[0], 'quantitative');
      domain = updateDomain(domain, value[1], 'quantitative');
    }

    return domain
  }

  function createDomainForSingleValue (type, value) {
    let domain;

    if (type === 'quantitative') {
      domain = [value - 1, value + 1];
    }

    if (type === 'categorical') {
      domain = [value];
    }

    if (type === 'temporal') {
      domain = [getDay(value, -1), getDay(value, 1)];
    }

    if (type === 'interval') {
      domain = value.sort((a, b) => a > b);
    }

    return domain
  }

  function getDay (date, days) {
    const dateCopy = new Date(date.getTime());
    return new Date(dateCopy.setDate(dateCopy.getDate() + days))
  }

  function getNewKey (keyColumn) {
    const domain = calculateDomain(keyColumn, '$key');
    return domain[1] + 1
  }

  function generateKeyColumn (length) {
    return new Array(length).fill(0).map((_, i) => i)
  }

  function validateKeyColumn (keyColumn, requiredLength) {
    if (keyColumn.length !== requiredLength) {
      throw new Error('Key column must be of same length as rest of the data')
    }

    ensureAllSameType(keyColumn);
    ensureUnique(keyColumn);
  }

  function ensureAllSameType (keyColumn) {
    for (let i = 0; i < keyColumn.length; i++) {
      const key = keyColumn[i];
      validateKey(key);
    }
  }

  function validateKey (key) {
    const type = getDataType(key);

    if (type !== 'quantitative' || !Number.isInteger(key)) {
      throw new Error('Key column can contain only integers')
    }
  }

  function ensureUnique (keyColumn) {
    if (keyColumn.length !== new Set(keyColumn).size) {
      throw new Error('Keys must be unique')
    }
  }

  function getDataLength (data) {
    let firstKey = Object.keys(data)[0];
    let firstColumn = data[firstKey];
    return firstColumn.length
  }

  function convertRowToColumnData (data) {
    checkIfDataIsEmpty(data);
    let columnData = initColumnData(data);

    for (let row of data) {
      for (let key in row) {
        columnData[key].push(row[key]);
      }
    }

    return columnData
  }

  function initColumnData (data) {
    let firstRow = data[0];
    let columnKeys = Object.keys(firstRow);
    let columnData = {};

    for (let key of columnKeys) {
      columnData[key] = [];
    }

    return columnData
  }

  function checkIfDataIsEmpty (data) {
    if (data.length === 0) {
      throw new Error('Received empty Array while trying to load row-oriented data. This is not allowed.')
    }
  }

  function parseGeoJSON (geojsonData) {
    const geometryData = [];
    const data = {};

    const features = geojsonData.features;
    const firstFeature = features[0];

    if ('properties' in firstFeature) {
      for (const columnName in firstFeature.properties) {
        data[columnName] = [];
      }
    }

    for (let i = 0; i < features.length; i++) {
      const { geometry, properties } = features[i];
      geometryData.push(geometry);

      for (const columnName in properties) {
        data[columnName].push(properties[columnName]);
      }
    }

    checkFormatColumnData(data);

    data.$geometry = geometryData;

    return data
  }

  const methods = {
    _setColumnData (data, options) {
      if (options.validate === false) {
        checkFormatInternal(data);
      } else {
        checkFormatColumnData(data);
      }

      this._storeData(data, options);
    },

    _setRowData (rowData, options) {
      const columnData = convertRowToColumnData(rowData);
      this._setColumnData(columnData, options);
    },

    _setGeoJSON (geojsonData, options) {
      const data = parseGeoJSON(geojsonData);
      this._storeData(data, options);
    },

    _setGroup (group, options) {
      const data = group.data;
      checkFormatInternal(data);
      this._storeData(data, options);
    },

    _storeData (data, options) {
      this._data = data;

      this._setupKeyColumn();

      if (options.validate === true) {
        this.validateAllColumns();
      }
    },

    _setupKeyColumn () {
      const length = getDataLength(this._data);

      if ('$key' in this._data) {
        validateKeyColumn(this._data.$key, length);
        this._syncKeyToRowNumber();
      } else {
        const keyColumn = generateKeyColumn(length);
        this._setKeyColumn(keyColumn);
      }
    },

    _setKeyColumn (keyColumn) {
      this._data = produce(this._data, draft => {
        draft.$key = keyColumn;
      });

      this._syncKeyToRowNumber();
    },

    _syncKeyToRowNumber () {
      const length = getDataLength(this._data);

      for (let i = 0; i < length; i++) {
        const key = this._data.$key[i];
        this._keyToRowNumber[key] = i;
      }
    }
  };

  function dataLoadingMixin (targetClass) {
    Object.assign(targetClass.prototype, methods);
  }

  function filter (data, filterFunction) {
    const length = getDataLength(data);
    const newData = {};
    for (const colName in data) { newData[colName] = []; }

    for (let i = 0; i < length; i++) {
      const row = {};
      for (const colName in data) { row[colName] = data[colName][i]; }

      if (filterFunction(row, i) === true) {
        for (const colName in row) { newData[colName].push(row[colName]); }
      }
    }

    return newData
  }

  function select (data, selection) {
    if (selection.constructor === String) {
      selection = [selection];
    }

    if (selection.constructor === Array) {
      for (const key in data) {
        if (!selection.includes(key)) {
          delete data[key];
        }
      }
    } else {
      throw new Error('select can only be used with a string or array of strings')
    }
  }

  function arrange (data, sortInstructions) {
    if (sortInstructions.constructor === Object) {
      sort(data, sortInstructions);
    } else if (sortInstructions.constructor === Array) {
      for (let i = sortInstructions.length - 1; i >= 0; i--) {
        const instruction = sortInstructions[i];
        sort(data, instruction);
      }
    } else {
      throw new Error('arrange requires a key-value object or array of key-value objects')
    }
  }

  const sortFuncs = {
    quantitative: {
      // https://beta.observablehq.com/@mbostock/manipulating-flat-arrays
      ascending: (a, b) => a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN,
      descending: (a, b) => b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
    },
    categorical: {
      ascending: (a, b) => {
        const sorted = [a, b].sort();
        return sorted[0] === a ? -1 : 1
      },
      descending: (a, b) => {
        const sorted = [a, b].sort();
        return sorted[0] === a ? 1 : -1
      }
    },
    temporal: {
      ascending: (c, d) => {
        const a = c.getTime();
        const b = c.getTime();
        return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN
      },
      descending: (c, d) => {
        const a = c.getTime();
        const b = c.getTime();
        return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
      }
    }
  };

  function sort (data, sortInstructions) {
    if (Object.keys(sortInstructions).length !== 1) {
      throw new Error('Only one key-value pair allowed')
    }

    const variable = Object.keys(sortInstructions)[0];
    const sortMethod = sortInstructions[variable];

    ensureValidDataType(data[variable][0]);
    const dataType = getDataType(data[variable][0]);

    let sortFunc;
    if (sortMethod.constructor === String) {
      sortFunc = sortFuncs[dataType][sortMethod];
    }
    if (sortMethod.constructor === Function) {
      sortFunc = sortMethod;
    }

    const column = data[variable];

    const indices = column.map((v, i) => i);
    const sortedIndices = indices.sort((a, b) => sortFunc(column[a], column[b]));

    for (const colName in data) {
      data[colName] = reorder(data[colName], sortedIndices);
    }
  }

  function reorder (column, indices) {
    return indices.map(i => column[i])
  }

  function rename (data, renameInstructions) {
    if (renameInstructions.constructor !== Object) {
      throw new Error('Rename only accepts an object')
    }

    for (const oldName in renameInstructions) {
      if (oldName in data) {
        const newName = renameInstructions[oldName];
        checkRegularColumnName(newName);
        data[newName] = data[oldName];
        delete data[oldName];
      } else {
        warn(`Rename: column '${oldName}' not found`);
      }
    }
  }

  function mutate (data, mutateInstructions) {
    const length = getDataLength(data);

    for (const key in mutateInstructions) {
      data[key] = new Array(length);
    }

    for (let i = 0; i < length; i++) {
      const row = {};
      let prevRow = {};
      let nextRow = {};

      for (const colName in data) {
        row[colName] = data[colName][i];
        prevRow[colName] = data[colName][i - 1];
        nextRow[colName] = data[colName][i + 1];
      }

      if (i === 0) { prevRow = undefined; }
      if (i === length - 1) { nextRow = undefined; }

      for (const key in mutateInstructions) {
        const mutateFunction = mutateInstructions[key];
        data[key][i] = mutateFunction(row, i, prevRow, nextRow);
      }
    }
  }

  function transmute (data, mutateObj) {
    data = mutate(data, mutateObj);

    for (const key in data) {
      if (!(key in mutateObj)) {
        delete data[key];
      }
    }
  }

  var aggregations = {
    count,
    sum: sum$1,
    mean,
    median,
    mode,
    min,
    max
  };

  function count (column) {
    return column.length
  }

  function sum$1 (column) {
    let total = 0;
    for (const value of column) {
      total += value;
    }

    return total
  }

  function mean (column) {
    return sum$1(column) / count(column)
  }

  function median (column) {
    const asc = column.sort((a, b) => a > b);
    const len = count(column);

    if (len % 2 === 1) {
      // Odd
      return asc[Math.floor(len / 2)]
    } else {
      // Even
      const lower = asc[(len / 2) - 1];
      const upper = asc[(len / 2)];
      return (lower + upper) / 2
    }
  }

  function mode (column) {
    const counts = {};

    for (const value of column) {
      if (value in counts) {
        counts[value]++;
      } else {
        counts[value] = 1;
      }
    }

    let winner;
    let winningVal = 0;

    for (const value in counts) {
      if (counts[value] > winningVal) {
        winningVal = counts[value];
        winner = value;
      }
    }

    return winner
  }

  function min (column) {
    let winner = Infinity;
    for (const value of column) {
      if (value < winner) { winner = value; }
    }
    return winner
  }

  function max (column) {
    let winner = -Infinity;
    for (const value of column) {
      if (value > winner) { winner = value; }
    }
    return winner
  }

  function checkKeyValuePair (obj, allowedKeys) {
    const keys = Object.keys(obj);
    if (keys.length !== 1) {
      throw new Error('Invalid transformation syntax')
    }

    const key = keys[0];

    if (!allowedKeys.includes(key)) {
      throw new Error(`Unknown transformation ${key}`)
    }

    return key
  }

  function summarise (data, summariseInstructions) {
    if (summariseInstructions.constructor !== Object) {
      throw new Error('summarise must be an object')
    }

    let newData = initNewData(summariseInstructions, data);

    if ('$grouped' in data) {
      checkSummariseInstructions(summariseInstructions, data);

      for (const columnName in data) {
        if (columnName !== '$grouped') {
          newData[columnName] = data[columnName];
        }
      }

      for (const group of data.$grouped) {
        const data = group.data();
        newData = summariseGroup(data, summariseInstructions, newData);
      }
    } else {
      newData = summariseGroup(data, summariseInstructions, newData);
    }
    return newData
  }

  function initNewData (summariseInstructions, data) {
    const newData = {};
    for (const newCol in summariseInstructions) { newData[newCol] = []; }
    if (data && '$grouped' in data) {
      for (const col in data) {
        if (col !== '$grouped') {
          newData[col] = [];
        }
      }
    }
    return newData
  }

  function summariseGroup (data, summariseInstructions, newData) {
    for (const newColName in summariseInstructions) {
      const instruction = summariseInstructions[newColName];

      if (instruction.constructor === Object) {
        const column = checkKeyValuePair(instruction, Object.keys(data));
        const aggregation = instruction[column];

        if (aggregation.constructor === String) {
          if (!(aggregation in aggregations)) {
            throw new Error(`Unkown summaryMethod: '${aggregation}'.`)
          }

          newData[newColName].push(aggregations[aggregation](data[column]));
        } else if (aggregation.constructor === Function) {
          newData[newColName].push(aggregation(data[column]));
        } else {
          throw new Error(`Invalid summaryMethod: '${aggregation}'. Must be String or Function`)
        }
      }
    }

    return newData
  }

  function checkSummariseInstructions (summariseInstructions, data) {
    for (const newColName in summariseInstructions) {
      const instruction = summariseInstructions[newColName];
      const name = Object.keys(instruction)[0];

      checkRegularColumnName(name);

      if (name in data) {
        throw new Error(`Cannot summarise the column '${name}': used for grouping`)
      }
    }
  }

  function mutarise (data, mutariseInstructions) {
    if (mutariseInstructions.constructor !== Object) {
      throw new Error('mutarise must be an object')
    }

    let newCols = initNewData(mutariseInstructions);

    if ('$grouped' in data) {
      checkSummariseInstructions(mutariseInstructions, data);

      for (const group of data.$grouped) {
        let summarizedData = initNewData(mutariseInstructions);
        const dataInGroup = group.data();
        summarizedData = summariseGroup(dataInGroup, mutariseInstructions, summarizedData);

        const length = getDataLength(dataInGroup);
        newCols = addGroupSummaries(newCols, summarizedData, length);
      }

      data = ungroup(data);
    } else {
      let summarizedData = initNewData(mutariseInstructions);
      summarizedData = summariseGroup(data, mutariseInstructions, summarizedData);

      const length = getDataLength(data);
      newCols = addGroupSummaries(newCols, summarizedData, length);
    }

    return join(data, newCols)
  }

  function addGroupSummaries (newCols, summarizedData, length) {
    for (let i = 0; i < length; i++) {
      for (const key in summarizedData) {
        newCols[key].push(summarizedData[key][0]);
      }
    }

    return newCols
  }

  function ungroup (data) {
    const newData = initNewData(data.$grouped[0].data());

    for (const group of data.$grouped) {
      const groupData = group.data();
      for (const col in newData) {
        newData[col].push(...groupData[col]);
      }
    }

    return newData
  }

  function join (data, newCols) {
    for (const col in newCols) {
      data[col] = newCols[col];
    }

    return data
  }

  function groupBy (data, groupByInstructions) {
    const groupedData = {};

    const groupedColumns = getGroupedColumns(data, groupByInstructions);
    const groups = groupBy$1(data, groupedColumns);

    groupedData.$grouped = groups.map(group => new DataContainer(group));
    for (const col of groupedColumns) {
      groupedData[col] = [];
    }

    for (let i = 0; i < groupedColumns.length; i++) {
      const col = groupedColumns[i];

      for (const group of groups) {
        groupedData[col].push(group.groupedValues[i]);
      }
    }

    return groupedData
  }

  function getGroupedColumns (data, groupByInstructions) {
    const con = groupByInstructions.constructor;
    if (![String, Array].includes(con)) {
      throw new Error('groupBy can only be used with a string or array of strings')
    }

    const groupedColumns = con === String ? [groupByInstructions] : groupByInstructions;

    for (const col of groupedColumns) {
      if (!(col in data)) {
        throw new Error(`Column '${col}' not found`)
      }
    }

    if (groupedColumns.length === Object.keys(data).length) {
      throw new Error('Cannot group by all columns')
    }

    return groupedColumns
  }

  function getGroupedValues (data, i, columns) {
    const groupedValues = [];
    for (const col of columns) {
      groupedValues.push(data[col][i]);
    }

    return groupedValues
  }

  function groupBy$1 (data, groupedColumns) {
    const groups = {};

    const length = getDataLength(data);

    for (let i = 0; i < length; i++) {
      // Ge grouped values
      const groupedValues = getGroupedValues(data, i, groupedColumns);

      // Get unique identifier for group
      const groupID = JSON.stringify(groupedValues);

      // If groups object has no entry for this group yet: create new group object
      groups[groupID] = groups[groupID] || new Group(data, groupedValues);

      // Add row to group
      groups[groupID].addRow(data, i);
    }

    // Convert groups object to array
    return Object.keys(groups).map(group => {
      return groups[group]
    })
  }

  class Group {
    constructor (data, groupedValues) {
      this.data = {};
      this.groupedValues = groupedValues;

      for (const col in data) {
        this.data[col] = [];
      }
    }

    addRow (data, i) {
      for (const col in data) {
        this.data[col].push(data[col][i]);
      }
    }
  }

  /**
  * geostats() is a tiny and standalone javascript library for classification
  * Project page - https://github.com/simogeo/geostats
  * Copyright (c) 2011 Simon Georget, http://www.intermezzo-coop.eu
  * Licensed under the MIT license
  */

  var _t = function (str) {
    return str
  };

  // taking from http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
  var isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  };

  function Geostats (a) {
    this.objectID = '';
    this.separator = ' - ';
    this.legendSeparator = this.separator;
    this.method = '';
    this.precision = 0;
    this.precisionflag = 'auto';
    this.roundlength = 2; // Number of decimals, round values
    this.is_uniqueValues = false;
    this.debug = false;
    this.silent = false;

    this.bounds = [];
    this.ranges = [];
    this.inner_ranges = null;
    this.colors = [];
    this.counter = [];

    // statistics information
    this.stat_sorted = null;
    this.stat_mean = null;
    this.stat_median = null;
    this.stat_sum = null;
    this.stat_max = null;
    this.stat_min = null;
    this.stat_pop = null;
    this.stat_variance = null;
    this.stat_stddev = null;
    this.stat_cov = null;

    /**
   * logging method
   */
    this.log = function (msg, force) {
      if (this.debug === true || force != null) {
        console.log(this.objectID + '(object id) :: ' + msg);
      }
    };

    /**
   * Set bounds
   */
    this.setBounds = function (a) {
      this.log('Setting bounds (' + a.length + ') : ' + a.join());

      this.bounds = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))

      this.bounds = a;
      // this.bounds = this.decimalFormat(a);
    };

    /**
   * Set a new serie
   */
    this.setSerie = function (a) {
      this.log('Setting serie (' + a.length + ') : ' + a.join());

      this.serie = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))
      this.serie = a;

      // reset statistics after changing serie
      this.resetStatistics();

      this.setPrecision();
    };

    /**
   * Set colors
   */
    this.setColors = function (colors) {
      this.log('Setting color ramp (' + colors.length + ') : ' + colors.join());

      this.colors = colors;
    };

    /**
     * Get feature count
     * With bounds array(0, 0.75, 1.5, 2.25, 3);
     * should populate this.counter with 5 keys
     * and increment counters for each key
     */
    this.doCount = function () {
      if (this._nodata()) { return }

      var tmp = this.sorted();

      this.counter = [];

      // we init counter with 0 value
      for (let i = 0; i < this.bounds.length - 1; i++) {
        this.counter[i] = 0;
      }

      for (let j = 0; j < tmp.length; j++) {
        // get current class for value to increment the counter
        var cclass = this.getClass(tmp[j]);
        this.counter[cclass]++;
      }
    };

    /**
     * Set decimal precision according to user input
     * or automatcally determined according
     * to the given serie.
     */
    this.setPrecision = function (decimals) {
      // only when called from user
      if (typeof decimals !== 'undefined') {
        this.precisionflag = 'manual';
        this.precision = decimals;
      }

      // we calculate the maximal decimal length on given serie
      if (this.precisionflag === 'auto') {
        for (var i = 0; i < this.serie.length; i++) {
          // check if the given value is a number and a float
          var precision;
          if (!isNaN((this.serie[i] + '')) && (this.serie[i] + '').toString().indexOf('.') !== -1) {
            precision = (this.serie[i] + '').split('.')[1].length;
          } else {
            precision = 0;
          }

          if (precision > this.precision) {
            this.precision = precision;
          }
        }
      }
      if (this.precision > 20) {
        // prevent "Uncaught RangeError: toFixed() digits argument must be between 0 and 20" bug. See https://github.com/simogeo/geostats/issues/34
        this.log('this.precision value (' + this.precision + ') is greater than max value. Automatic set-up to 20 to prevent "Uncaught RangeError: toFixed()" when calling decimalFormat() method.');
        this.precision = 20;
      }

      this.log('Calling setPrecision(). Mode : ' + this.precisionflag + ' - Decimals : ' + this.precision);

      this.serie = this.decimalFormat(this.serie);
    };

    /**
     * Format array numbers regarding to precision
     */
    this.decimalFormat = function (a) {
      var b = [];

      for (var i = 0; i < a.length; i++) {
        // check if the given value is a number
        if (isNumber(a[i])) {
          b[i] = parseFloat(parseFloat(a[i]).toFixed(this.precision));
        } else {
          b[i] = a[i];
        }
      }

      return b
    };

    /**
     * Transform a bounds array to a range array the following array : array(0,
     * 0.75, 1.5, 2.25, 3); becomes : array('0-0.75', '0.75-1.5', '1.5-2.25',
     * '2.25-3');
     */
    this.setRanges = function () {
      this.ranges = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))

      for (let i = 0; i < (this.bounds.length - 1); i++) {
        this.ranges[i] = this.bounds[i] + this.separator + this.bounds[i + 1];
      }
    };

    /** return min value */
    this.min = function () {
      if (this._nodata()) { return }

      this.stat_min = this.serie[0];

      for (let i = 0; i < this.pop(); i++) {
        if (this.serie[i] < this.stat_min) {
          this.stat_min = this.serie[i];
        }
      }

      return this.stat_min
    };

    /** return max value */
    this.max = function () {
      if (this._nodata()) { return }

      this.stat_max = this.serie[0];
      for (let i = 0; i < this.pop(); i++) {
        if (this.serie[i] > this.stat_max) {
          this.stat_max = this.serie[i];
        }
      }

      return this.stat_max
    };

    /** return sum value */
    this.sum = function () {
      if (this._nodata()) { return }

      if (this.stat_sum === null) {
        this.stat_sum = 0;
        for (let i = 0; i < this.pop(); i++) {
          this.stat_sum += parseFloat(this.serie[i]);
        }
      }

      return this.stat_sum
    };

    /** return population number */
    this.pop = function () {
      if (this._nodata()) { return }

      if (this.stat_pop === null) {
        this.stat_pop = this.serie.length;
      }

      return this.stat_pop
    };

    /** return mean value */
    this.mean = function () {
      if (this._nodata()) { return }

      if (this.stat_mean === null) {
        this.stat_mean = parseFloat(this.sum() / this.pop());
      }

      return this.stat_mean
    };

    /** return median value */
    this.median = function () {
      if (this._nodata()) { return }

      if (this.stat_median === null) {
        this.stat_median = 0;
        var tmp = this.sorted();

        // serie pop is odd
        if (tmp.length % 2) {
          this.stat_median = parseFloat(tmp[(Math.ceil(tmp.length / 2) - 1)]);

        // serie pop is even
        } else {
          this.stat_median = (parseFloat(tmp[((tmp.length / 2) - 1)]) + parseFloat(tmp[(tmp.length / 2)])) / 2;
        }
      }

      return this.stat_median
    };

    /** return variance value */
    this.variance = function (round) {
      round = (typeof round === 'undefined');

      if (this._nodata()) { return }

      if (this.stat_variance === null) {
        var tmp = 0;
        var serieMean = this.mean();
        for (var i = 0; i < this.pop(); i++) {
          tmp += Math.pow((this.serie[i] - serieMean), 2);
        }

        this.stat_variance = tmp / this.pop();

        if (round === true) {
          this.stat_variance = Math.round(this.stat_variance * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
        }
      }

      return this.stat_variance
    };

    /** return standard deviation value */
    this.stddev = function (round) {
      round = (typeof round === 'undefined');

      if (this._nodata()) { return }

      if (this.stat_stddev === null) {
        this.stat_stddev = Math.sqrt(this.variance());

        if (round === true) {
          this.stat_stddev = Math.round(this.stat_stddev * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
        }
      }

      return this.stat_stddev
    };

    /** coefficient of variation - measure of dispersion */
    this.cov = function (round) {
      round = (typeof round === 'undefined');

      if (this._nodata()) { return }

      if (this.stat_cov === null) {
        this.stat_cov = this.stddev() / this.mean();

        if (round === true) {
          this.stat_cov = Math.round(this.stat_cov * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
        }
      }

      return this.stat_cov
    };

    /** reset all attributes after setting a new serie */
    this.resetStatistics = function () {
      this.stat_sorted = null;
      this.stat_mean = null;
      this.stat_median = null;
      this.stat_sum = null;
      this.stat_max = null;
      this.stat_min = null;
      this.stat_pop = null;
      this.stat_variance = null;
      this.stat_stddev = null;
      this.stat_cov = null;
    };

    /** data test */
    this._nodata = function () {
      if (this.serie.length === 0) {
        if (this.silent) this.log('[silent mode] Error. You should first enter a serie!', true);
        else throw new TypeError('Error. You should first enter a serie!')
        return 1
      } else { return 0 }
    };

    /** ensure nbClass is an integer */
    this._nbClassInt = function (nbClass) {
      var nbclassTmp = parseInt(nbClass, 10);
      if (isNaN(nbclassTmp)) {
        if (this.silent) this.log("[silent mode] '" + nbclassTmp + "' is not a valid integer. Enable to set class number.", true);
        else throw new TypeError("'" + nbclassTmp + "' is not a valid integer. Enable to set class number.")
      } else {
        return nbclassTmp
      }
    };

    /** check if the serie contains negative value */
    this._hasNegativeValue = function () {
      for (let i = 0; i < this.serie.length; i++) {
        if (this.serie[i] < 0) { return true }
      }
      return false
    };

    /** check if the serie contains zero value */
    this._hasZeroValue = function () {
      for (let i = 0; i < this.serie.length; i++) {
        if (parseFloat(this.serie[i]) === 0) { return true }
      }
      return false
    };

    /** return sorted values (as array) */
    this.sorted = function () {
      if (this.stat_sorted === null) {
        if (this.is_uniqueValues === false) {
          this.stat_sorted = this.serie.sort(function (a, b) {
            return a - b
          });
        } else {
          this.stat_sorted = this.serie.sort(function (a, b) {
            var nameA = a.toString().toLowerCase(); var nameB = b.toString().toLowerCase();
            if (nameA < nameB) return -1
            if (nameA > nameB) return 1
            return 0
          });
        }
      }

      return this.stat_sorted
    };

    /**
   * Set Manual classification Return an array with bounds : ie array(0,
   * 0.75, 1.5, 2.25, 3);
   * Set ranges and prepare data for displaying legend
   *
   */
    this.setClassManually = function (array) {
      if (this._nodata()) { return }

      if (array[0] !== this.min() || array[array.length - 1] !== this.max()) {
        if (this.silent) this.log('[silent mode] ' + _t('Given bounds may not be correct! please check your input.\nMin value : ' + this.min() + ' / Max value : ' + this.max()), true);
        else throw new TypeError(_t('Given bounds may not be correct! please check your input.\nMin value : ' + this.min() + ' / Max value : ' + this.max()))
        return
      }

      this.setBounds(array);
      this.setRanges();

      // we specify the classification method
      this.method = _t('manual classification') + ' (' + (array.length - 1) + ' ' + _t('classes') + ')';

      return this.bounds
    };

    /**
   * Equal intervals classification Return an array with bounds : ie array(0,
   * 0.75, 1.5, 2.25, 3);
   */
    this.getClassEqInterval = function (nbClass, forceMin, forceMax) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      var tmpMin = (typeof forceMin === 'undefined') ? this.min() : forceMin;
      var tmpMax = (typeof forceMax === 'undefined') ? this.max() : forceMax;

      var a = [];
      var val = tmpMin;
      var interval = (tmpMax - tmpMin) / nbClass;

      for (let i = 0; i <= nbClass; i++) {
        a[i] = val;
        val += interval;
      }

      // -> Fix last bound to Max of values
      a[nbClass] = tmpMax;

      this.setBounds(a);
      this.setRanges();

      // we specify the classification method
      this.method = _t('eq. intervals') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds
    };

    this.getQuantiles = function (nbClass) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      var tmp = this.sorted();
      var quantiles = [];

      var step = this.pop() / nbClass;
      for (var i = 1; i < nbClass; i++) {
        var qidx = Math.round(i * step + 0.49);
        quantiles.push(tmp[qidx - 1]); // zero-based
      }

      return quantiles
    };

    /**
   * Quantile classification Return an array with bounds : ie array(0, 0.75,
   * 1.5, 2.25, 3);
   */
    this.getClassQuantile = function (nbClass) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      var tmp = this.sorted();
      var bounds = this.getQuantiles(nbClass);
      bounds.unshift(tmp[0]);

      if (bounds[tmp.length - 1] !== tmp[tmp.length - 1]) { bounds.push(tmp[tmp.length - 1]); }

      this.setBounds(bounds);
      this.setRanges();

      // we specify the classification method
      this.method = _t('quantile') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds
    };

    /**
   * Standard Deviation classification
   * Return an array with bounds : ie array(0,
   * 0.75, 1.5, 2.25, 3);
   */
    this.getClassStdDeviation = function (nbClass, matchBounds) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      var tmpMax = this.max();
      var tmpMin = this.min();
      var tmpStdDev = this.stddev();
      var tmpMean = this.mean();

      var a = [];

      // number of classes is odd
      if (nbClass % 2 === 1) {
        // Euclidean division to get the inferior bound
        var infBound = Math.floor(nbClass / 2);

        var supBound = infBound + 1;

        // we set the central bounds
        a[infBound] = tmpMean - (tmpStdDev / 2);
        a[supBound] = tmpMean + (tmpStdDev / 2);

        // Values < to infBound, except first one
        for (let i = infBound - 1; i > 0; i--) {
          let val = a[i + 1] - tmpStdDev;
          a[i] = val;
        }

        // Values > to supBound, except last one
        for (let i = supBound + 1; i < nbClass; i++) {
          let val = a[i - 1] + tmpStdDev;
          a[i] = val;
        }

        // number of classes is even
      } else {
        var meanBound = nbClass / 2;

        // we get the mean value
        a[meanBound] = tmpMean;

        // Values < to the mean, except first one
        for (let i = meanBound - 1; i > 0; i--) {
          let val = a[i + 1] - tmpStdDev;
          a[i] = val;
        }

        // Values > to the mean, except last one
        for (let i = meanBound + 1; i < nbClass; i++) {
          let val = a[i - 1] + tmpStdDev;
          a[i] = val;
        }
      }

      // we finally set the first value
      // do we excatly match min value or not ?
      a[0] = (typeof matchBounds === 'undefined') ? a[1] - tmpStdDev : tmpMin;

      // we finally set the last value
      // do we excatly match max value or not ?
      a[nbClass] = (typeof matchBounds === 'undefined') ? a[nbClass - 1] + tmpStdDev : tmpMax;

      this.setBounds(a);
      this.setRanges();

      // we specify the classification method
      this.method = _t('std deviation') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds
    };

    /**
   * Geometric Progression classification
   * http://en.wikipedia.org/wiki/Geometric_progression
   * Return an array with bounds : ie array(0,
   * 0.75, 1.5, 2.25, 3);
   */
    this.getClassGeometricProgression = function (nbClass) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      if (this._hasNegativeValue() || this._hasZeroValue()) {
        if (this.silent) this.log('[silent mode] ' + _t('geometric progression can\'t be applied with a serie containing negative or zero values.'), true);
        else throw new TypeError(_t('geometric progression can\'t be applied with a serie containing negative or zero values.'))
        return
      }

      var a = [];
      var tmpMin = this.min();
      var tmpMax = this.max();

      var logMax = Math.log(tmpMax) / Math.LN10; // max decimal logarithm (or base 10)
      var logMin = Math.log(tmpMin) / Math.LN10; // min decimal logarithm (or base 10)

      var interval = (logMax - logMin) / nbClass;

      // we compute log bounds
      for (let i = 0; i < nbClass; i++) {
        if (i === 0) {
          a[i] = logMin;
        } else {
          a[i] = a[i - 1] + interval;
        }
      }

      // we compute antilog
      a = a.map(function (x) { return Math.pow(10, x) });

      // and we finally add max value
      a.push(this.max());

      this.setBounds(a);
      this.setRanges();

      // we specify the classification method
      this.method = _t('geometric progression') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds
    };

    /**
   * Arithmetic Progression classification
   * http://en.wikipedia.org/wiki/Arithmetic_progression
   * Return an array with bounds : ie array(0,
   * 0.75, 1.5, 2.25, 3);
   */
    this.getClassArithmeticProgression = function (nbClass) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      var denominator = 0;

      // we compute the (french) "Raison"
      for (let i = 1; i <= nbClass; i++) {
        denominator += i;
      }

      var a = [];
      var tmpMin = this.min();
      var tmpMax = this.max();

      var interval = (tmpMax - tmpMin) / denominator;

      for (let i = 0; i <= nbClass; i++) {
        if (i === 0) {
          a[i] = tmpMin;
        } else {
          a[i] = a[i - 1] + (i * interval);
        }
      }

      this.setBounds(a);
      this.setRanges();

      // we specify the classification method
      this.method = _t('arithmetic progression') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds
    };

    /**
   * Credits : Doug Curl (javascript) and Daniel J Lewis (python implementation)
   * http://www.arcgis.com/home/item.html?id=0b633ff2f40d412995b8be377211c47b
   * http://danieljlewis.org/2010/06/07/jenks-natural-breaks-algorithm-in-python/
   */
    this.getClassJenks = function (nbClass) {
      nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

      if (this._nodata()) { return }

      let dataList = this.sorted();

      // now iterate through the datalist:
      // determine mat1 and mat2
      // really not sure how these 2 different arrays are set - the code for
      // each seems the same!
      // but the effect are 2 different arrays: mat1 and mat2
      var mat1 = [];
      // for (var x = 0, xl = dataList.length + 1; x < xl; x++) {
      for (var x = 0; x < dataList.length + 1; x++) {
        var temp = [];
        for (var j = 0, jl = nbClass + 1; j < jl; j++) {
          temp.push(0);
        }
        mat1.push(temp);
      }

      var mat2 = [];
      // for (var i = 0, il = dataList.length + 1; i < il; i++) {
      for (var i = 0; i < dataList.length + 1; i++) {
        var temp2 = [];
        for (var c = 0, cl = nbClass + 1; c < cl; c++) {
          temp2.push(0);
        }
        mat2.push(temp2);
      }

      // absolutely no idea what this does - best I can tell, it sets the 1st
      // group in the
      // mat1 and mat2 arrays to 1 and 0 respectively
      for (var y = 1, yl = nbClass + 1; y < yl; y++) {
        mat1[0][y] = 1;
        mat2[0][y] = 0;
        for (var t = 1, tl = dataList.length + 1; t < tl; t++) {
          mat2[t][y] = Infinity;
        }
        var v = 0.0;
      }

      // and this part - I'm a little clueless on - but it works
      // pretty sure it iterates across the entire dataset and compares each
      // value to
      // one another to and adjust the indices until you meet the rules:
      // minimum deviation
      // within a class and maximum separation between classes
      for (var l = 2, ll = dataList.length + 1; l < ll; l++) {
        var s1 = 0.0;
        var s2 = 0.0;
        var w = 0.0;
        for (var m = 1, ml = l + 1; m < ml; m++) {
          var i3 = l - m + 1;
          var val = parseFloat(dataList[i3 - 1]);
          s2 += val * val;
          s1 += val;
          w += 1;
          v = s2 - (s1 * s1) / w;
          var i4 = i3 - 1;
          if (i4 !== 0) {
            for (var p = 2, pl = nbClass + 1; p < pl; p++) {
              if (mat2[l][p] >= (v + mat2[i4][p - 1])) {
                mat1[l][p] = i3;
                mat2[l][p] = v + mat2[i4][p - 1];
              }
            }
          }
        }
        mat1[l][1] = 1;
        mat2[l][1] = v;
      }

      var k = dataList.length;
      var kclass = [];

      // fill the kclass (classification) array with zeros:
      for (i = 0; i <= nbClass; i++) {
        kclass.push(0);
      }

      // this is the last number in the array:
      kclass[nbClass] = parseFloat(dataList[dataList.length - 1]);
      // this is the first number - can set to zero, but want to set to lowest
      // to use for legend:
      kclass[0] = parseFloat(dataList[0]);
      var countNum = nbClass;
      while (countNum >= 2) {
        var id = parseInt((mat1[k][countNum]) - 2);
        kclass[countNum - 1] = dataList[id];
        k = parseInt((mat1[k][countNum] - 1));
        // spits out the rank and value of the break values:
        // console.log("id="+id,"rank = " + String(mat1[k][countNum]),"val =
        // " + String(dataList[id]))
        // count down:
        countNum -= 1;
      }
      // check to see if the 0 and 1 in the array are the same - if so, set 0
      // to 0:
      if (kclass[0] === kclass[1]) {
        kclass[0] = 0;
      }

      this.setBounds(kclass);
      this.setRanges();

      this.method = _t('Jenks') + ' (' + nbClass + ' ' + _t('classes') + ')';

      return this.bounds // array of breaks
    };

    /**
   * Quantile classification Return an array with bounds : ie array(0, 0.75,
   * 1.5, 2.25, 3);
   */
    this.getClassUniqueValues = function () {
      if (this._nodata()) { return }

      this.is_uniqueValues = true;
      var tmp = this.sorted(); // display in alphabetical order

      var a = [];

      for (let i = 0; i < this.pop(); i++) {
        if (a.indexOf(tmp[i]) === -1) {
          a.push(tmp[i]);
        }
      }

      this.bounds = a;

      // we specify the classification method
      this.method = _t('unique values');

      return a
    };

    /**
   * Return the class of a given value.
   * For example value : 6
   * and bounds array = (0, 4, 8, 12);
   * Return 2
   */
    this.getClass = function (value) {
      for (let i = 0; i < this.bounds.length; i++) {
        if (this.is_uniqueValues === true) {
          if (value === this.bounds[i]) { return i }
        } else {
        // parseFloat() is necessary
          if (parseFloat(value) <= this.bounds[i + 1]) {
            return i
          }
        }
      }

      return _t("Unable to get value's class.")
    };

    /**
   * Return the ranges array : array('0-0.75', '0.75-1.5', '1.5-2.25',
   * '2.25-3');
   */
    this.getRanges = function () {
      return this.ranges
    };

    /**
   * Returns the number/index of this.ranges that value falls into
   */
    this.getRangeNum = function (value) {
      var bounds, i;

      for (i = 0; i < this.ranges.length; i++) {
        bounds = this.ranges[i].split(/ - /);
        if (value <= parseFloat(bounds[1])) {
          return i
        }
      }
    };

    /*
   * Compute inner ranges based on serie.
   * Produce discontinous ranges used for legend - return an array similar to :
   * array('0.00-0.74', '0.98-1.52', '1.78-2.25', '2.99-3.14');
   * If inner ranges already computed, return array values.
   */
    this.getInnerRanges = function () {
      // if already computed, we return the result
      if (this.inner_ranges != null) {
        return this.inner_ranges
      }

      var a = [];
      var tmp = this.sorted();
      var cnt = 1; // bounds array counter

      for (let i = 0; i < tmp.length; i++) {
        let rangeFirstValue;
        if (i === 0) {
          rangeFirstValue = tmp[i]; // we init first range value
        }

        if (parseFloat(tmp[i]) > parseFloat(this.bounds[cnt])) {
          a[cnt - 1] = '' + rangeFirstValue + this.separator + tmp[i - 1];

          rangeFirstValue = tmp[i];

          cnt++;
        }

        // we reach the last range, we finally complete manually
        // and return the array
        if (cnt === (this.bounds.length - 1)) {
        // we set the last value
          a[cnt - 1] = '' + rangeFirstValue + this.separator + tmp[tmp.length - 1];

          this.inner_ranges = a;
          return this.inner_ranges
        }
      }
    };

    this.getSortedlist = function () {
      return this.sorted().join(', ')
    };

    // object constructor
    // At the end of script. If not setPrecision() method is not known

    // we create an object identifier for debugging
    this.objectID = new Date().getUTCMilliseconds();
    this.log('Creating new geostats object');

    if (typeof a !== 'undefined' && a.length > 0) {
      this.serie = a;
      this.setPrecision();
      this.log('Setting serie (' + a.length + ') : ' + a.join());
    } else {
      this.serie = [];
    }

    // creating aliases on classification function for backward compatibility
    this.getJenks = this.getClassJenks;
    this.getGeometricProgression = this.getClassGeometricProgression;
    this.getEqInterval = this.getClassEqInterval;
    this.getQuantile = this.getClassQuantile;
    this.getStdDeviation = this.getClassStdDeviation;
    this.getUniqueValues = this.getClassUniqueValues;
    this.getArithmeticProgression = this.getClassArithmeticProgression;
  }

  function bin (data, binInstructions) {
    if (binInstructions.constructor === Object) {
      const intervalBounds = getIntervalBounds(data, binInstructions);
      const ranges = pairRanges(intervalBounds);

      return bin1d(data, binInstructions.groupBy, ranges)
    }

    if (binInstructions.constructor === Array) {
      const intervalBoundsPerVariable = binInstructions.map(instructions => getIntervalBounds(data, instructions));
      const rangesPerVariable = intervalBoundsPerVariable.map(bounds => pairRanges(bounds));
      const variables = binInstructions.map(instructions => instructions.groupBy);

      return binKd(data, variables, rangesPerVariable)
    }
  }

  function getIntervalBounds (data, binInstructions) {
    const { groupBy, method, numClasses } = parseBinInstructions(binInstructions);

    const variableData = data[groupBy];
    if (!variableData) {
      throw new Error(`groupBy column '${groupBy}' does not exist`)
    }

    if (method === 'IntervalSize') {
      return createRangesFromBinSize(variableData, binInstructions.binSize)
    }

    if (method === 'Manual') {
      return binInstructions.manualClasses
    }

    const geoStat = new Geostats(variableData);
    return geoStat[methodMap[method]](numClasses)
  }

  function parseBinInstructions (binInstructions) {
    if (binInstructions.constructor !== Object) {
      throw new Error('Bin only accepts an Object')
    }

    const groupBy = binInstructions.groupBy;
    if (groupBy.constructor !== String) {
      throw new Error('groupBy only accepts a String variable name')
    }

    let method = binInstructions.method;
    if (!method) {
      warn('No binning method specified, defaulting to EqualInterval');
      method = 'EqualInterval';
    }
    if (method.constructor !== String) {
      warn('Binning method not recognized, defaulting to EqualInterval');
      method = 'EqualInterval';
    }

    let numClasses = binInstructions.numClasses;
    if (!numClasses) {
      warn('numClasses not specified, defaulting to 5');
      numClasses = 5;
    }

    return { groupBy, method, numClasses }
  }

  function createRangesFromBinSize (variableData, binSize) {
    if (!binSize) {
      throw new Error('Missing required option \'binSize\'')
    }

    const domain = calculateDomain(variableData);

    const binCount = Math.floor((domain[1] - domain[0]) / binSize);

    let lowerBound = domain[0];
    const ranges = [lowerBound];

    for (let i = 0; i < binCount - 1; i++) {
      const upperBound = lowerBound + binSize;
      ranges.push(upperBound);
      lowerBound = upperBound;
    }

    ranges.push(domain[1]);

    return ranges
  }

  const methodMap = {
    EqualInterval: 'getClassEqInterval',
    StandardDeviation: 'getClassStdDeviation',
    ArithmeticProgression: 'getClassArithmeticProgression',
    GeometricProgression: 'getClassGeometricProgression',
    Quantile: 'getClassQuantile',
    Jenks: 'getClassJenks'
  };

  function pairRanges (ranges) {
    const l = ranges.length;
    const newRange = [];

    for (let i = 0; i < l - 1; i++) {
      newRange.push([ranges[i], ranges[i + 1]]);
    }

    return newRange
  }

  function bin1d (data, variable, ranges) {
    // Create an empty array to store new groups divided by range
    const groups = Array(ranges.length);

    for (let i = 0; i < groups.length; i++) {
      groups[i] = {};

      for (const col in data) {
        groups[i][col] = [];
      }
    }

    const length = getDataLength(data);

    for (let i = 0; i < length; i++) {
      const value = data[variable][i];
      const binIndex = getBinIndex(ranges, value);

      if (binIndex !== -1) {
        for (const col in data) {
          groups[binIndex][col].push(data[col][i]);
        }
      }
    }

    // Remove empty bins
    const nonEmptyBinIndices = getNonEmptyBinIndices(groups);
    const nonEmptyRanges = nonEmptyBinIndices.map(i => ranges[i]);
    const nonEmptyGroups = nonEmptyBinIndices.map(i => groups[i]);

    // Add new grouped column to newData
    const newData = {
      bins: nonEmptyRanges,
      $grouped: nonEmptyGroups.map(group => new DataContainer(group, { validate: false }))
    };

    return newData
  }

  function getBinIndex (bins, value) {
    // Find index of bin in which the instance belongs
    const binIndex = bins.findIndex(function (bin, i) {
      if (i === bins.length - 1) {
        return value >= bin[0] && value <= bin[1]
      } else {
        return value >= bin[0] && value < bin[1]
      }
    });

    return binIndex
  }

  function getNonEmptyBinIndices (groups) {
    const nonEmptyBinIndices = [];

    for (let i = 0; i < groups.length; i++) {
      if (getDataLength(groups[i]) > 0) nonEmptyBinIndices.push(i);
    }

    return nonEmptyBinIndices
  }

  function binKd (data, variables, rangesPerVariable) {
    const binIndexTree = constructBinIndexTree(data, variables, rangesPerVariable);
    const binnedData = convertTreeIntoColumnData(binIndexTree, variables, rangesPerVariable);

    binnedData.$grouped = binnedData.$grouped.map(group => new DataContainer(group, { validate: false }));

    return binnedData
  }

  function constructBinIndexTree (data, variables, rangesPerVariable) {
    let binIndexTree = {};
    const dataLength = getDataLength(data);

    for (let i = 0; i < dataLength; i++) {
      const binIndices = getBinIndices(data, i, variables, rangesPerVariable);
      if (rowIsNotEmpty(binIndices)) {
        binIndexTree = updateBranch(binIndexTree, binIndices, data, i);
      }
    }

    return binIndexTree
  }

  function getBinIndices (data, index, variables, rangesPerVariable) {
    const binIndices = [];

    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      const value = data[variable][index];

      binIndices.push(getBinIndex(rangesPerVariable[i], value));
    }

    return binIndices
  }

  function rowIsNotEmpty (binIndices) {
    return binIndices.every(binIndex => binIndex > -1)
  }

  function updateBranch (tree, indices, data, rowIndex) {
    let currentLevel = tree;

    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];

      if (lastIndex(i, indices.length)) {
        if (!(index in currentLevel)) {
          currentLevel[index] = initGroup(data);
        }

        currentLevel[index] = addRow(currentLevel[index], data, rowIndex);
      } else {
        if (!(index in currentLevel)) {
          currentLevel[index] = {};
        }

        currentLevel = currentLevel[index];
      }
    }

    return tree
  }

  function lastIndex (i, length) {
    return i === (length - 1)
  }

  function initGroup (data) {
    const group = {};
    for (const columnName in data) {
      group[columnName] = [];
    }

    return group
  }

  function addRow (group, data, rowIndex) {
    for (const columnName in data) {
      group[columnName].push(data[columnName][rowIndex]);
    }

    return group
  }

  function convertTreeIntoColumnData (binIndexTree, variables, binsPerVariable) {
    const columnData = initColumnData$1(variables);
    const dataIndex = variables.length;

    forEachBranch(binIndexTree, branchArray => {
      for (let i = 0; i < variables.length; i++) {
        const binIndex = branchArray[i];
        const bin = binsPerVariable[i][binIndex];

        const binnedColumnName = getBinnedColumnName(variables[i]);

        columnData[binnedColumnName].push(bin);
      }

      columnData.$grouped.push(branchArray[dataIndex]);
    });

    return columnData
  }

  function initColumnData$1 (variables) {
    const columnData = { $grouped: [] };

    for (let i = 0; i < variables.length; i++) {
      const binnedColumnName = getBinnedColumnName(variables[i]);
      columnData[binnedColumnName] = [];
    }

    return columnData
  }

  function forEachBranch (tree, callback) {
    for (const path of traverse(tree)) {
      callback(path);
    }
  }

  // https://stackoverflow.com/a/45628445
  function * traverse (o) {
    const memory = new Set();

    function * innerTraversal (o, path = []) {
      if (memory.has(o)) {
        // we've seen this object before don't iterate it
        return
      }

      // add the new object to our memory.
      memory.add(o);

      for (const i of Object.keys(o)) {
        const itemPath = path.concat(i);

        if (!('$key' in o[i])) {
          yield * innerTraversal(o[i], itemPath);
        } else {
          itemPath.push(o[i]);
          yield itemPath;
        }
      }
    }

    yield * innerTraversal(o);
  }

  function getBinnedColumnName (columnName) {
    return 'bins_' + columnName
  }

  function dropNA (data, dropInstructions) {
    let filterFunc;

    if (!dropInstructions) {
      // If the instructions are falsy, we will check all columns for invalid values
      filterFunc = row => {
        let keep = true;

        for (const key in row) {
          const val = row[key];
          if (isInvalid(val)) {
            keep = false;
            break
          }
        }

        return keep
      };
    } else if (dropInstructions.constructor === String) {
      // If the instructions are a string, we check only one column for invalid values
      checkIfColumnsExist(data, [dropInstructions]);
      filterFunc = row => !isInvalid(row[dropInstructions]);
    } else if (dropInstructions.constructor === Array) {
      // if the instructions are an array, we check the columns named in the array
      checkIfColumnsExist(data, dropInstructions);
      filterFunc = row => {
        let keep = true;
        for (const col of dropInstructions) {
          if (isInvalid(row[col])) {
            keep = false;
            break
          }
        }

        return keep
      };
    } else {
      throw new Error('dropNA can only be passed undefined, a String or an Array of Strings')
    }

    return filter(data, filterFunc)
  }

  function checkIfColumnsExist (data, columns) {
    for (const col of columns) {
      if (!(col in data)) {
        throw new Error(`Column '${col}' not found`)
      }
    }
  }

  // This function comes from Turf's wonderful geospatial lib
  // We only need this single function and importing it from @turf/meta
  // doesn't work well for in-browser compilation
  // https://github.com/Turfjs/turf

  // The MIT License (MIT)

  // Copyright (c) 2019 Morgan Herlocker

  // Permission is hereby granted, free of charge, to any person obtaining a copy of
  // this software and associated documentation files (the "Software"), to deal in
  // the Software without restriction, including without limitation the rights to
  // use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
  // the Software, and to permit persons to whom the Software is furnished to do so,
  // subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in all
  // copies or substantial portions of the Software.

  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  // FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  // COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  // IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  // CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  function coordEach (geojson, callback, excludeWrapCoord) {
    // Handles null Geometry -- Skips this GeoJSON
    if (geojson === null) return
    var j; var k; var l; var geometry; var stopG; var coords;
    var geometryMaybeCollection;
    var wrapShrink = 0;
    var coordIndex = 0;
    var isGeometryCollection;
    var type = geojson.type;
    var isFeatureCollection = type === 'FeatureCollection';
    var isFeature = type === 'Feature';
    var stop = isFeatureCollection ? geojson.features.length : 1;

    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
      geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry
        : (isFeature ? geojson.geometry : geojson));
      isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
      stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

      for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
        var multiFeatureIndex = 0;
        var geometryIndex = 0;
        geometry = isGeometryCollection
          ? geometryMaybeCollection.geometries[geomIndex] : geometryMaybeCollection;

        // Handles null Geometry -- Skips this geometry
        if (geometry === null) continue
        coords = geometry.coordinates;
        var geomType = geometry.type;

        wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

        switch (geomType) {
          case null:
            break
          case 'Point':
            if (callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
            coordIndex++;
            multiFeatureIndex++;
            break
          case 'LineString':
          case 'MultiPoint':
            for (j = 0; j < coords.length; j++) {
              if (callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
              coordIndex++;
              if (geomType === 'MultiPoint') multiFeatureIndex++;
            }
            if (geomType === 'LineString') multiFeatureIndex++;
            break
          case 'Polygon':
          case 'MultiLineString':
            for (j = 0; j < coords.length; j++) {
              for (k = 0; k < coords[j].length - wrapShrink; k++) {
                if (callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
                coordIndex++;
              }
              if (geomType === 'MultiLineString') multiFeatureIndex++;
              if (geomType === 'Polygon') geometryIndex++;
            }
            if (geomType === 'Polygon') multiFeatureIndex++;
            break
          case 'MultiPolygon':
            for (j = 0; j < coords.length; j++) {
              geometryIndex = 0;
              for (k = 0; k < coords[j].length; k++) {
                for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                  if (callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
                  coordIndex++;
                }
                geometryIndex++;
              }
              multiFeatureIndex++;
            }
            break
          case 'GeometryCollection':
            for (j = 0; j < geometry.geometries.length; j++) { if (coordEach(geometry.geometries[j], callback, excludeWrapCoord) === false) return false }
            break
          default:
            throw new Error('Unknown Geometry Type')
        }
      }
    }
  }

  function transformGeometries (geometries, transformFunc) {
    const geometriesClone = JSON.parse(JSON.stringify(geometries));

    if (geometriesClone.constructor === Array) {
      for (let i = 0; i < geometriesClone.length; i++) {
        transformGeometryInplace(geometriesClone[i], transformFunc);
      }
    }

    if (geometriesClone.constructor === Object) {
      for (const key in geometriesClone) {
        transformGeometryInplace(geometriesClone[key], transformFunc);
      }
    }

    return geometriesClone
  }

  function transformGeometryInplace (geometry, transformFunc) {
    coordEach(geometry, coord => {
      const transformedPosition = transformFunc(coord);
      coord[0] = transformedPosition[0];
      coord[1] = transformedPosition[1];
    });
  }

  function reproject (data, transformation) {
    if (!('$geometry' in data)) {
      warn('No geometry column found. Skipping reproject-transformation.');
      return data
    }

    const transformedGeometries = transformGeometries(data.$geometry, transformation);
    data.$geometry = transformedGeometries;

    return data
  }

  function transform (data, transformFunction) {
    if (transformFunction.constructor !== Function) {
      throw new Error(`Invalid 'transform' transformation: must be a Function`)
    }

    transformFunction(data);
  }

  function cumsum (data, cumsumInstructions) {
    const length = getDataLength(data);
    const newColumns = {};

    for (const newColName in cumsumInstructions) {
      checkRegularColumnName(newColName);

      const oldColName = cumsumInstructions[newColName];

      if (getColumnType(data[oldColName]) !== 'quantitative') {
        throw new Error(`cumsum only works with quantitative data.`)
      }

      let currentSum = 0;
      newColumns[newColName] = [];

      for (let i = 0; i < length; i++) {
        const value = data[oldColName][i];

        if (!isInvalid(value)) {
          currentSum += value;
        }

        newColumns[newColName].push(currentSum);
      }
    }

    Object.assign(data, newColumns);
  }

  const transformations = {
    filter,
    select: produce(select),
    arrange: produce(arrange),
    rename: produce(rename),
    mutate: produce(mutate),
    transmute: produce(transmute),
    summarise,
    mutarise,
    groupBy,
    bin,
    dropNA,
    reproject,
    transform: produce(transform),
    cumsum: produce(cumsum)
  };

  const methods$1 = {
    arrange (sortInstructions) {
      const data = transformations.arrange(this._data, sortInstructions);
      return new DataContainer(data, { validate: false })
    },

    bin (binInstructions) {
      const data = transformations.bin(this._data, binInstructions);
      return new DataContainer(data, { validate: false })
    },

    cumsum (cumsumInstructions) {
      const data = transformations.cumsum(this._data, cumsumInstructions);
      return new DataContainer(data, { validate: false })
    },

    dropNA (dropInstructions) {
      const data = transformations.dropNA(this._data, dropInstructions);
      return new DataContainer(data, { validate: false })
    },

    filter (filterFunction) {
      const data = transformations.filter(this._data, filterFunction);
      return new DataContainer(data, { validate: false })
    },

    groupBy (groupByInstructions) {
      const data = transformations.groupBy(this._data, groupByInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutarise (mutariseInstructions) {
      const data = transformations.mutarise(this._data, mutariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutarize (mutariseInstructions) {
      const data = transformations.mutarise(this._data, mutariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutate (mutateInstructions) {
      const data = transformations.mutate(this._data, mutateInstructions);
      return new DataContainer(data, { validate: false })
    },

    transmute (transmuteInstructions) {
      const data = transformations.transmute(this._data, transmuteInstructions);
      return new DataContainer(data, { validate: false })
    },

    rename (renameInstructions) {
      const data = transformations.rename(this._data, renameInstructions);
      return new DataContainer(data, { validate: false })
    },

    reproject (reprojectInstructions) {
      const data = transformations.reproject(this._data, reprojectInstructions);
      return new DataContainer(data, { validate: false })
    },

    select (selection) {
      const data = transformations.select(this._data, selection);
      return new DataContainer(data, { validate: false })
    },

    summarise (summariseInstructions) {
      const data = transformations.summarise(this._data, summariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    summarize (summariseInstructions) {
      const data = transformations.summarise(this._data, summariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    transform (transformFunction) {
      const data = transformations.transform(this._data, transformFunction);
      return new DataContainer(data, { validate: false })
    }
  };

  function transformationsMixin (targetClass) {
    Object.assign(targetClass.prototype, methods$1);
  }

  function ensureValidRow (row, self) {
    for (const columnName in row) {
      if (!(columnName in self._data)) throw new Error(`Column '${columnName}' not found`)
    }

    for (const columnName in self._data) {
      if (columnName === '$key') {
        if (columnName in row) throw new Error('Cannot set \'$key\' column')
      } else {
        if (!(columnName in row)) throw new Error(`Missing column '${columnName}'`)

        const value = row[columnName];

        if (isInvalid(value)) {
          continue
        }

        const columnType = getColumnType(self._data[columnName]);

        ensureValidDataType(value);
        const valueType = getDataType(value);

        if (columnType !== valueType) {
          throw new Error(`Column '${columnName}' is of type '${columnType}'. Received value of type '${valueType}'`)
        }
      }
    }
  }

  function ensureRowExists (key, self) {
    if (isUndefined(self._keyToRowNumber[key])) {
      throw new Error(`Key '${key}' not found`)
    }
  }

  function isValidColumn (column, columnName) {
    const columnType = getColumnType(column);

    if (columnType === undefined) return false
    if (!columnNameMatchesType(columnName, columnType)) return false
    if (!allValidValuesHaveTheSameType(column, columnType)) return false

    return true
  }

  function ensureValidColumn (column, columnName) {
    const { nValidValues } = findFirstValidValue(column);

    if (nValidValues === 0) {
      throw new Error(`Invalid column '${columnName}'. Column contains only invalid values.`)
    }

    const columnType = getColumnType(column);

    if (columnType === undefined) throw new Error(`Column '${columnName}' contains data of unknown type`)
    ensureColumnNameMatchesType(columnType);
    ensureAllValidValuesHaveTheSameType(column, columnType, columnName);
  }

  function columnNameMatchesType (columnName, columnType) {
    if (columnName === '$geometry' && columnType !== 'geometry') return false
    if (columnName !== '$geometry' && columnType === 'geometry') return false

    return true
  }

  function ensureColumnNameMatchesType (columnName, columnType) {
    if (columnName === '$geometry' && columnType !== 'geometry') {
      throw new Error(`Column '$geometry' can only contain data of type 'geometry', received '${columnType}'`)
    }

    if (columnName !== '$geometry' && columnType === 'geometry') {
      throw new Error(`Only the '$geometry' column can contain data of type 'geometry'`)
    }
  }

  function allValidValuesHaveTheSameType (column, columnType) {
    for (let i = 0; i < column.length; i++) {
      const value = column[i];

      if (isInvalid(value)) continue

      const valueType = getDataType(value);

      if (valueType !== columnType) {
        return false
      }
    }

    return true
  }

  function ensureAllValidValuesHaveTheSameType (column, columnType, columnName) {
    if (!allValidValuesHaveTheSameType(column, columnType)) {
      throw new Error(`Column '${columnName}' mixes types`)
    }
  }

  function columnExists (columnName, self) {
    return columnName in self._data
  }

  function ensureColumnExists (columnName, self) {
    if (!columnExists(columnName, self)) {
      throw new Error(`Invalid column name: '${columnName}'`)
    }
  }

  class DataContainer {
    constructor (data, options = { validate: true }) {
      this._data = {};
      this._keyToRowNumber = {};

      if (isColumnOriented(data)) {
        this._setColumnData(data, options);
        return
      }

      if (isRowOriented(data)) {
        this._setRowData(data, options);
        return
      }

      if (isGeoJSON(data)) {
        this._setGeoJSON(data, options);
        return
      }

      if (data instanceof Group) {
        this._setGroup(data, options);
        return
      }

      throw invalidDataError
    }

    // Accessing data
    data () {
      return this._data
    }

    row (key) {
      const rowNumber = this._keyToRowNumber[key];
      return this._row(rowNumber)
    }

    prevRow (key) {
      const rowNumber = this._keyToRowNumber[key];
      const previousRowNumber = rowNumber - 1;
      return this._row(previousRowNumber)
    }

    nextRow (key) {
      const rowNumber = this._keyToRowNumber[key];
      const nextRowNumber = rowNumber + 1;
      return this._row(nextRowNumber)
    }

    rows () {
      const rows = [];
      const length = getDataLength(this._data);

      for (let i = 0; i < length; i++) {
        rows.push(this._row(i));
      }

      return rows
    }

    column (columnName) {
      ensureColumnExists(columnName, this);
      return this._data[columnName]
    }

    map (columnName, mapFunction) {
      return this.column(columnName).map(mapFunction)
    }

    domain (columnName) {
      const column = this.column(columnName);
      return calculateDomain(column, columnName)
    }

    type (columnName) {
      const column = this.column(columnName);
      return getColumnType(column)
    }

    // Checks
    hasColumn (columnName) {
      return columnExists(columnName, this)
    }

    columnIsValid (columnName) {
      const column = this.column(columnName);
      return isValidColumn(column, columnName)
    }

    validateColumn (columnName) {
      const column = this.column(columnName);
      ensureValidColumn(column, columnName);
    }

    validateAllColumns () {
      for (const columnName in this._data) {
        this.validateColumn(columnName);
      }
    }

    // Adding and removing rows
    addRow (row) {
      ensureValidRow(row, this);

      this._data = produce(this._data, draft => {
        for (const columnName in row) {
          draft[columnName].push(row[columnName]);
        }
      });

      const rowNumber = getDataLength(this._data) - 1;
      const key = getNewKey(this._data.$key);

      this._data.$key.push(key);
      this._keyToRowNumber[key] = rowNumber;
    }

    updateRow (key, row) {
      ensureRowExists(key, this);
      ensureValidRow(row, this);
      const rowNumber = this._keyToRowNumber[key];

      this._data = produce(this._data, draft => {
        for (const columnName in row) {
          if (columnName === '$key') {
            warn(`Cannot update '$key' of row`);
            continue
          }

          const value = row[columnName];
          draft[columnName][rowNumber] = value;
        }
      });
    }

    deleteRow (key) {
      ensureRowExists(key, this);
      const rowNumber = this._keyToRowNumber[key];
      delete this._keyToRowNumber[key];

      this._data = produce(this._data, draft => {
        for (const columnName in draft) {
          draft[columnName].splice(rowNumber, 1);
        }
      });
    }

    // Private methods
    _row (rowNumber) {
      const length = getDataLength(this._data);

      if (rowNumber < 0 || rowNumber >= length) {
        return undefined
      }

      const row = {};

      for (const columnName in this._data) {
        const value = this._data[columnName][rowNumber];
        row[columnName] = value;
      }

      return row
    }
  }

  dataLoadingMixin(DataContainer);
  transformationsMixin(DataContainer);

  const invalidDataError = new Error('Data passed to DataContainer is of unknown format');

  return DataContainer;

}));
