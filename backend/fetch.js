async function main() {
  const query = new URLSearchParams();
  query.append("className", "7");
  query.append("section", "A");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/ai/visualdesign/published?${query.toString()}`);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
main();
