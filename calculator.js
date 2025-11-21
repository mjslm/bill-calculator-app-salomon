function calculateBill() {
  const kwh = parseFloat(document.getElementById("kwh").value);
  const rate = parseFloat(document.getElementById("rate").value);

  if (isNaN(kwh) || isNaN(rate)) {
    document.getElementById("totalDisplay").innerText = "$0.00";
    return;
  }

  const total = kwh * rate;
  document.getElementById("totalDisplay").innerText = "$" + total.toFixed(2);
}
