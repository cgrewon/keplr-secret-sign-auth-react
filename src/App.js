import React from "react";
import "./App.css";
import * as keplr from "./keplr/func";

function App() {
  const [address, setAddress] = React.useState("");
  const [signature, setSignature] = React.useState({});
  const [checkRes, setCheckRes] = React.useState();

  const onGetSignature = async () => {
    const _address = await keplr.getAddress();
    setAddress(_address);

    const sig = await keplr.getSignature();
    setSignature(sig);
    console.log(sig);
  };

  const onCheckSignature = async () => {
    if (!signature || !address) {
      alert("Please try to get signature at first.");
      return;
    }
    const res = await keplr.checkSignature(signature, address);
    console.log("result", res);
    setCheckRes(res);
  };
  return (
    <div className="App">
      <p>Check Keplr Sign Memo [signAmino]</p>
      <div>Address : "{address}"</div>
      <div>
        <pre>{JSON.stringify(signature, null, 2)}</pre>
      </div>
      <button onClick={onGetSignature}>Get Signature</button>
      <div>
        <h3>Checkig Signature Result For Address :[{address}]</h3>
        <pre>Check Results: {checkRes + ""}</pre>
      </div>
      <button onClick={onCheckSignature}>Check Signature</button>
    </div>
  );
}

export default App;
