import axios from 'axios';
import { Peer } from 'peerjs';

var wapiAuthInit = function wapiAuthInit(wapi) {
  var wapiAuth = {};
  wapiAuth.mintOAuthToken = function () {
    var referrerURL = new URL(document.referrer);
    wapi.getTieredToken(referrerURL.hostname, wapi.readToken().provider).then(function (response) {
      wapiAuth.oAuthToken = response.data.token;
    });
  };
  wapi.isSignedIn() && document.referrer ? wapiAuth.mintOAuthToken() : wapiAuth.oAuthToken = null;
  wapiAuth.sendToken = function () {
    window.opener.postMessage({
      type: "auth",
      token: wapiAuth.oAuthToken
    }, "*");
    window.close();
  };
  wapiAuth.logIn = function (provider, username, password, setAuth, setStatus) {
    axios.post(wapi.defaultAPIProtocol + "//" + provider + "/web10token", {
      username: username,
      password: password,
      token: null,
      site: window.location.hostname,
      target: null
    }).then(function (response) {
      wapi.setToken(response.data.token);
      setAuth(true);
      wapiAuth.mintOAuthToken();
    })["catch"](function (error) {
      return setStatus("Log in failed : " + error.response.data.detail);
    });
  };
  wapiAuth.signUp = function (provider, username, password, betacode, phone) {
    return axios.post(wapi.defaultAPIProtocol + "//" + provider + "/signup", {
      username: username,
      password: password,
      betacode: betacode,
      phone: phone
    });
  };
  wapiAuth.SMRListen = function (setState) {
    if (window.opener) {
      window.addEventListener("message", function (e) {
        if (e.data.type === "smr") setState(e.data);
      });
      window.opener.postMessage({
        type: "SMRListen"
      }, "*");
    }
  };
  var api = function api() {
    return wapi.defaultAPIProtocol + "//" + wapi.readToken()["provider"];
  };
  wapiAuth.changePass = function (pass, newPass) {
    return axios.post(api() + "/change_pass", {
      username: wapi.readToken()["username"],
      password: pass,
      new_pass: newPass
    });
  };
  wapiAuth.changePhone = function (pass, newPhone) {
    console.log("in : ", pass, newPhone);
    return axios.post(api() + "/change_phone", {
      username: wapi.readToken()["username"],
      password: pass,
      phone: newPhone
    });
  };
  wapiAuth.sendCode = function () {
    return axios.post(api() + "/send_code", {
      token: wapi.token
    });
  };
  wapiAuth.verifyCode = function (code) {
    return axios.post(api() + "/verify_code", {
      token: wapi.token,
      query: {
        code: code
      }
    });
  };
  wapiAuth.manageSpace = function () {
    return axios.post(api() + "/manage_space", {
      token: wapi.token
    });
  };
  wapiAuth.manageCredits = function () {
    return axios.post(api() + "/manage_credits", {
      token: wapi.token
    });
  };
  wapiAuth.manageBusiness = function () {
    return axios.post(api() + "/manage_business", {
      token: wapi.token
    });
  };
  wapiAuth.manageSubscriptions = function () {
    return axios.post(api() + "/manage_subscriptions", {
      token: wapi.token
    });
  };
  wapiAuth.businessLogin = function () {
    return axios.post(api() + "/business_login", {
      token: wapi.token
    });
  };
  wapiAuth.getPlan = function () {
    return axios.post(api() + "/get_plan", {
      token: wapi.token
    });
  };
  return wapiAuth;
};

function cookieDict() {
  return window.document.cookie.split(";").reduce(function (res, c) {
    var _c$trim$split$map = c.trim().split("=").map(decodeURIComponent),
      key = _c$trim$split$map[0],
      val = _c$trim$split$map[1];
    try {
      var _Object$assign;
      return Object.assign(res, (_Object$assign = {}, _Object$assign[key] = JSON.parse(val), _Object$assign));
    } catch (e) {
      var _Object$assign2;
      return Object.assign(res, (_Object$assign2 = {}, _Object$assign2[key] = val, _Object$assign2));
    }
  }, {});
}
var wapiInit = function wapiInit(authUrl, rtcOrigin, protocol) {
  if (authUrl === void 0) {
    authUrl = "https://auth.web10.app";
  }
  if (rtcOrigin === void 0) {
    rtcOrigin = "rtc.web10.app";
  }
  if (protocol === void 0) {
    protocol = null;
  }
  var wapi = {};
  wapi.defaultAPIProtocol = protocol ? protocol + ":" : new URL(authUrl).protocol;
  wapi.childWindow = null;
  wapi.token = cookieDict()["token"];
  wapi.setToken = function (token) {
    wapi.token = token;
    var age = 3600 * 24 * 60;
    document.cookie = "token=" + wapi.token + ";Secure;path=/;max-age=" + age + ";";
  };
  wapi.scrubToken = function () {
    document.cookie = "token=;max-age=-1;path=/;";
    wapi.token = null;
  };
  wapi.openAuthPortal = function () {
    return wapi.childWindow = window.open(authUrl, "_blank");
  };
  wapi.isSignedIn = function () {
    return wapi.token != null;
  };
  wapi.signOut = function () {
    return wapi.scrubToken();
  };
  wapi.authListen = function (setAuth) {
    return window.addEventListener("message", function (e) {
      if (e.data.type === "auth") {
        wapi.setToken(e.data.token || "");
        if (setAuth != null) setAuth(wapi.isSignedIn());
      }
    });
  };
  wapi.readToken = function () {
    return !wapi.token ? null : JSON.parse(atob(wapi.token.split(".")[1]));
  };
  wapi.getTieredToken = function (site, target, protocol) {
    if (protocol === void 0) {
      protocol = wapi.defaultAPIProtocol;
    }
    return axios.post(protocol + "//" + wapi.readToken().provider + "/web10token", {
      username: wapi.readToken().username,
      password: null,
      token: wapi.token,
      site: site,
      target: target
    });
  };
  wapi.read = function (service, query, username, provider, protocol) {
    if (query === void 0) {
      query = null;
    }
    if (username === void 0) {
      username = null;
    }
    if (provider === void 0) {
      provider = null;
    }
    if (protocol === void 0) {
      protocol = wapi.defaultAPIProtocol;
    }
    return wapi._W10CRUD(axios.patch, provider, username, service, query, null, protocol);
  };
  wapi.create = function (service, query, username, provider, protocol) {
    if (query === void 0) {
      query = null;
    }
    if (username === void 0) {
      username = null;
    }
    if (provider === void 0) {
      provider = null;
    }
    if (protocol === void 0) {
      protocol = wapi.defaultAPIProtocol;
    }
    return wapi._W10CRUD(axios.post, provider, username, service, query, null, protocol);
  };
  wapi.update = function (service, query, update, username, provider, protocol) {
    if (query === void 0) {
      query = null;
    }
    if (update === void 0) {
      update = null;
    }
    if (username === void 0) {
      username = null;
    }
    if (provider === void 0) {
      provider = null;
    }
    if (protocol === void 0) {
      protocol = wapi.defaultAPIProtocol;
    }
    return wapi._W10CRUD(axios.put, provider, username, service, query, update, protocol);
  };
  wapi["delete"] = function (service, query, username, provider, protocol) {
    if (query === void 0) {
      query = null;
    }
    if (username === void 0) {
      username = null;
    }
    if (provider === void 0) {
      provider = null;
    }
    if (protocol === void 0) {
      protocol = wapi.defaultAPIProtocol;
    }
    return wapi._W10CRUD(function (url, data) {
      return axios["delete"](url, {
        data: data
      });
    }, provider, username, service, query, null, protocol);
  };
  wapi._W10CRUD = function (HTTPRequestFunction, provider, username, service, query, update, protocol) {
    if (!username && !wapi.token || username === "anon") return console.error("cant CRUD anon accounts");
    if (!provider && !wapi.token) return console.error("web10 request without provider and token. need one.");
    provider = provider || wapi.readToken().provider;
    username = username || wapi.readToken().username;
    return HTTPRequestFunction(protocol + "//" + provider + "/" + username + "/" + service, {
      token: wapi.token,
      query: query,
      update: update
    });
  };
  wapi.SMROnReady = function (sirs, scrs) {
    return window.addEventListener("message", function (e) {
      return e.data["type"] === "SMRListen" && wapi.childWindow.postMessage({
        type: "smr",
        sirs: sirs,
        scrs: scrs
      }, "*");
    });
  };
  wapi.SMRResponseListen = function (setStatus) {
    return window.addEventListener("message", function (e) {
      return e.data.type === "status" && setStatus(e.data.status);
    });
  };
  wapi.peer = null;
  wapi.peerID = function (provider, user, origin, label) {
    return (provider + " " + user + " " + origin + " " + label).replaceAll(".", "_");
  };
  wapi.inBound = {};
  wapi.initP2P = function (onInbound, label, secure) {
    if (onInbound === void 0) {
      onInbound = null;
    }
    if (label === void 0) {
      label = "";
    }
    if (secure === void 0) {
      secure = true;
    }
    var token = wapi.readToken();
    var id = wapi.peerID(token.provider, token.username, token.site, label);
    wapi.peer = new Peer(id, {
      host: rtcOrigin,
      secure: secure,
      port: secure ? 443 : 80,
      path: '/',
      token: wapi.token + "~" + label
    });
    if (onInbound) {
      wapi.peer.on('connection', function (conn) {
        wapi.inBound[conn.peer] = conn;
        conn.on('data', function (data) {
          return onInbound(conn, data);
        });
        conn.on('close', function () {
          return delete wapi.inBound[conn.peer];
        });
      });
    }
  };
  wapi.outBound = {};
  wapi.P2P = function (provider, username, origin, label) {
    if (!wapi.peer) console.error("not initialized");
    var id = wapi.peerID(provider, username, origin, label);
    var conn = null;
    if (!wapi.outBound[id]) {
      conn = wapi.peer.connect(id);
      wapi.outBound[conn.peer] = conn;
      conn.on('close', function () {
        return delete wapi.outBound[conn.peer];
      });
    } else conn = wapi.outBound[id];
    return conn;
  };
  wapi.send = function (provider, username, origin, label, data) {
    var conn = wapi.P2P(provider, username, origin, label);
    if (conn.open) {
      conn.send(data);
      return {
        connected: true
      };
    } else {
      conn.on('open', function () {
        return conn.send(data);
      });
      return {
        connected: false
      };
    }
  };
  wapi.checkout = function (seller, title, price, success_url, cancel_url) {
    return axios.post(wapi.defaultAPIProtocol + "//" + wapi.readToken().provider + "/dev_pay", {
      token: wapi.token,
      seller: seller,
      title: title,
      price: price,
      success_url: success_url,
      cancel_url: cancel_url
    }).then(function (response) {
      return window.location.href = response.data;
    });
  };
  wapi.verifySubscription = function (seller, title) {
    return axios.patch(wapi.defaultAPIProtocol + "//" + wapi.readToken().provider + "/dev_pay", {
      token: wapi.token,
      seller: seller,
      title: title,
      price: null
    });
  };
  wapi.cancelSubscription = function (seller, title) {
    return axios["delete"](wapi.defaultAPIProtocol + "//" + wapi.readToken().provider + "/dev_pay", {
      data: {
        token: wapi.token,
        seller: seller,
        title: title
      }
    });
  };
  axios.post('https://api.web10.app/register_app', {
    "url": window.location.href.split('?')[0]
  });
  return wapi;
};
window.wapiInit = wapiInit;
window.wapiAuthInit = wapiAuthInit;

export { wapiAuthInit, wapiInit };
//# sourceMappingURL=wapi.modern.js.map
