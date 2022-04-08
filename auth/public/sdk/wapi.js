//wapi can be double loaded. try locally first and if that fails, load from the cdn
if (typeof wapiInit === "undefined") {
  //makes a dictionary of cookies
  function cookieDict() {
    return document.cookie.split(";").reduce((res, c) => {
      const [key, val] = c.trim().split("=").map(decodeURIComponent);
      try {
        return Object.assign(res, { [key]: JSON.parse(val) });
      } catch (e) {
        return Object.assign(res, { [key]: val });
      }
    }, {});
  }

  //initializes the wapi library object
  function wapiInit(authUrl = "https://auth.web10.app") {
    const wapi = {};

    // get the default api protocol, which is required to match its auth portals protocol
    wapi.defaultAPIProtocol = new URL(authUrl).protocol;

    //wapi variables
    wapi.childWindow = null;
    wapi.token = cookieDict()["token"];

    //sets the api key in wapi and stores it in cookies
    wapi.setToken = function (token) {
      wapi.token = token;
      //set the cookie max age to 60 days (1 day padding from the true 61 day expiration)
      const age = 3600 * 24 * 60;
      document.cookie = `token=${wapi.token};Secure;path=/;max-age=${age};`;
    };
    //scrub the api keys from wapi and deletes it from cookies
    wapi.scrubToken = function () {
      document.cookie = "token=;max-age=-1;path=/;";
      wapi.token = null;
    };

    //opens up a child window for auth stuff
    wapi.openAuthPortal = () =>
      (wapi.childWindow = window.open(authUrl, "_blank"));

    //checks if wapi is currently signed in
    wapi.isSignedIn = () => wapi.token != null;
    //signs out wapi
    wapi.signOut = () => wapi.scrubToken();

    //listens for an oauth result from the child window
    wapi.authListen = function (setAuth) {
      window.addEventListener("message", function (e) {
        if (e.data.type === "auth") {
          wapi.setToken(e.data.token);
          if (setAuth != null) setAuth(wapi.isSignedIn());
        }
      });
    };

    wapi.readToken = function () {
      if (!wapi.token) return null;
      return JSON.parse(atob(wapi.token.split(".")[1]));
    };

    //get tiered tokens for strong web10 security
    wapi.getTieredToken = function (
      site,
      target,
      protocol = wapi.defaultAPIProtocol
    ) {
      return axios.post(
        `${protocol}//${wapi.readToken().provider}/web10token`,
        {
          username: wapi.readToken().username,
          password: null,
          token: wapi.token,
          site: site,
          target: target,
        }
      );
    };

    //CRUD functionality (patch instead of get (secure) since patch can have a body)
    wapi.read = function (
      service,
      query = null,
      username = null,
      provider = null,
      protocol = wapi.defaultAPIProtocol
    ) {
      return wapi._W10CRUD(
        axios.patch,
        provider,
        username,
        service,
        query,
        null,
        protocol
      );
    };
    wapi.create = function (
      service,
      query = null,
      username = null,
      provider = null,
      protocol = wapi.defaultAPIProtocol
    ) {
      return wapi._W10CRUD(
        axios.post,
        provider,
        username,
        service,
        query,
        null,
        protocol
      );
    };
    wapi.update = function (
      service,
      query = null,
      update = null,
      username = null,
      provider = null,
      protocol = wapi.defaultAPIProtocol
    ) {
      return wapi._W10CRUD(
        axios.put,
        provider,
        username,
        service,
        query,
        update,
        protocol
      );
    };
    wapi.delete = function (
      service,
      query = null,
      username = null,
      provider = null,
      protocol = wapi.defaultAPIProtocol
    ) {
      //axios delete is implemented differently
      const deleteWrapper = (url, data) => axios.delete(url, { data: data });
      return wapi._W10CRUD(
        deleteWrapper,
        provider,
        username,
        service,
        query,
        null,
        protocol
      );
    };
    wapi._W10CRUD = function (
      HTTPRequestFunction,
      provider,
      username,
      service,
      query,
      update,
      protocol
    ) {
      if (!provider && !wapi.token) {
        console.error("web10 request without provider or token");
        return;
      }
      provider = provider ? provider : wapi.readToken().provider;
      username = username ? username : wapi.readToken().username;
      const t = {
        token: wapi.token,
        query: query,
        update: update,
      };
      const url = `${protocol}//${provider}/${username}/${service}`;
      return HTTPRequestFunction(url, t);
    };

    //SMRs
    wapi.SMROnReady = function (sirs, scrs) {
      window.addEventListener("message", function (e) {
        if (e.data["type"] === "SMRListen") {
          wapi.childWindow.postMessage(
            {
              type: "smr",
              sirs: sirs,
              scrs: scrs,
            },
            "*"
          );
        }
      });
    };

    wapi.SMRResponseListen = function (setStatus) {
      window.addEventListener("message", function (e) {
        if (e.data.type === "status") setStatus(e.data.status);
      });
    };

    wapi.checkout = function (seller, title, price,successUrl,cancelUrl) {
      return axios.post(
        `${wapi.defaultAPIProtocol}//${wapi.readToken().provider}/dev_pay`,
        {
          token: wapi.token,
          seller: seller,
          title: title,
          price: price,
          success_url:successUrl,
          cancel_url:cancelUrl
        }
      ).then((response)=>{
        window.location.href = response.data;
      });
    };

    wapi.verifySubscription = function (seller, title) {
      return axios.patch(
        `${wapi.defaultAPIProtocol}//${wapi.readToken().provider}/dev_pay`,
        {
          token: wapi.token,
          seller: seller,
          title: title,
          price:null,
        }
      );
    };

    wapi.cancelSubscription = function (seller, title) {
      return axios.delete(
        `${wapi.defaultAPIProtocol}//${wapi.readToken().provider}/dev_pay`,
        {
          data: {
            token: wapi.token,
            seller: seller,
            title: title,
          },
        }
      );
    };

    //output the wapi object
    return wapi;
  }
}
