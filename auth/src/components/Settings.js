import React from "react";

var wapiAuth = window.wapiAuth;

function Settings({ verified, setStatus, servicesLoad }) {
  console.log(verified);
  return (
    <div style={{ marginLeft: "5px" }}>
      <Capacity></Capacity>
      {verified ? (
        <Payment setStatus={setStatus} servicesLoad={servicesLoad}></Payment>
      ) : (
        <Verify setStatus={setStatus}></Verify>
      )}
      <br></br>
      <ChangeUser></ChangeUser>
      <br></br>
      <ChangePass setStatus={setStatus}></ChangePass>
      <br></br>
      <Unlink></Unlink>
    </div>
  );
}

function Unlink() {
  return (
    <div style={{ marginLeft: "4px" }}>
      <u>Linked Devices / Accounts</u>
      <br></br>
      <button style={{marginTop:"4px"}}
        className="button is-primary is-light is-small"
        onClick={() => {
          wapiAuth.portal().then((response) => {
            window.location.href = response.data["url"];
          });
        }}
      >
        {" "}
        Unlink Phone Number
      </button>
    </div>
  );
}

// Payment component
function Payment({ setStatus, servicesLoad }) {
  return (
    <div style={{ marginTop: "5px", marginLeft: "5px" }}>
      <button
        className="button is-primary is-light is-small"
        onClick={() => {
          wapiAuth.portal().then((response) => {
            window.location.href = response.data["url"];
          });
        }}
      >
        {" "}
        Modify Plans
      </button>
      <button
        style={{ marginLeft: "5px" }}
        className="button is-success is-light is-small"
        onClick={() => {
          wapiAuth.payment().then((response) => {
            window.location.href = response.data["url"];
          });
        }}
      >
        {" "}
        Purchase Credits
      </button>
    </div>
  );
}

function Capacity() {
  var cap = "x";
  var total = 64;
  return (
    <div style={{ marginLeft: "3px" }}>
      <input
        style={{ width: "230px" }}
        placeholder={`plan : web 10 free tier`}
        readOnly
      ></input>
      <br></br>
      <p
        style={{
          marginLeft: "2px",
          width: "300px",
          color: "gray",
          fontFamily: "monospace",
        }}
      >
        storage capacity utilization : {cap}/{total} mb
      </p>
    </div>
  );
}

// Payment component
function Verify({ setStatus }) {
  return (
    <div style={{ marginTop: "10px" }}>
      <p style={{ marginLeft: "2px" }}>
        verification code :{" "}
        <input
          id="code"
          style={{
            color: "lightgreen",
            width: "100px",
            marginTop: "2px",
            backgroundColor: "black",
          }}
          placeholder={"012345"}
        ></input>
      </p>
      <div style={{ marginTop: "5px" }}>
        <button
          style={{ marginRight: "5px" }}
          className="button is-warning"
          onClick={() => wapiAuth.sendCode()}
        >
          {" "}
          Send Code{" "}
        </button>
        <button
          onClick={() =>
            wapiAuth
              .verifyCode(document.getElementById("code").value)
              .then(setStatus("success"))
              .catch(setStatus("wrong code.."))
          }
          style={{ marginRight: "5px" }}
          className="button is-warning"
        >
          {" "}
          Verify Code{" "}
        </button>
        <p style={{ color: "orange", marginLeft: "2px", marginTop: "2px" }}>
          verify your phone number and recieve free web10 credits
        </p>
      </div>
    </div>
  );
}

// Changing username and/or password component
function ChangeUser() {
  return (
    <div style={{ marginLeft: "4px", marginRight: "4px" }}>
      <u>Change Username</u> <br></br>
      Type New Username :{" "}
      <input
        id="deleteConfirmation"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"new-username"}
      ></input>
      <br></br>
      Retype New Username :{" "}
      <input
        id="deleteConfirmation"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"new-username"}
      ></input>
      <br></br>
      Type Password To Confirm :{" "}
      <input
        id="deleteConfirmation"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"password"}
      ></input>
      <br></br>
      <button
        // onClick={() => {
        //   if (document.getElementById("deleteConfirmation").value === service) {
        //     wapi
        //       .delete("services", { service: service })
        //       .then((response) => {
        //         setStatus("service deletion successful! reloading...");
        //         setTimeout(() => callback(), 1000);
        //       })
        //       .catch((e) => {
        //         setStatus(e.response.data.detail);
        //       });
        //   } else
        //     setStatus(
        //       "type the name of the service in the delete confirmation box to delete this service"
        //     );
        // }}
        className="button is-small is-danger"
        style={{ marginTop: "4px" }}
      >
        Change Username
      </button>
    </div>
  );
}

// Changing username and/or password component
function ChangePass({ setStatus }) {
  return (
    <div style={{ marginTop: "4px", marginLeft: "4px", marginRight: "4px" }}>
      <u>Change Password</u>
      <br></br>
      Type New Password :{" "}
      <input
        id="newpass1"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"new-password"}
      ></input>
      <br></br>
      Retype New Password :{" "}
      <input
        id="newpass2"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"new-password"}
      ></input>
      <br></br>
      Type Current Password To Confirm :{" "}
      <input
        id="regpass"
        style={{ backgroundColor: "black", color: "lightgreen" }}
        placeholder={"current-password"}
      ></input>
      <br></br>
      <button
        onClick={() => {
          const pass = document.getElementById("regpass").value;
          const np1 = document.getElementById("newpass1").value;
          const np2 = document.getElementById("newpass2").value;
          if (np1 == np2)
            wapiAuth
              .changePass(pass, np1)
              .then(setStatus("successful password change"));
          else setStatus("retype is different.");
        }}
        className="button is-small is-info"
        style={{ marginTop: "4px" }}
      >
        Change Password
      </button>
    </div>
  );
}

export { Settings };
