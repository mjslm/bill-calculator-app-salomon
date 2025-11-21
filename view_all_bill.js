document.getElementById("filter").addEventListener("change", function () {
  const filterValue = this.value;
  const tableBody = document.querySelector("table tbody");
  const rows = Array.from(tableBody.querySelectorAll("tr"));

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  rows.sort((a, b) => {
    const yearA = parseInt(a.children[1].textContent);
    const yearB = parseInt(b.children[1].textContent);

    const monthA = months.indexOf(a.children[0].textContent.trim());
    const monthB = months.indexOf(b.children[0].textContent.trim());

    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  if (filterValue === "latest") rows.reverse();

  tableBody.innerHTML = "";
  rows.forEach(row => {
    row.style.opacity = "0";
    tableBody.appendChild(row);
    setTimeout(() => (row.style.opacity = "1"), 80);
  });
});
