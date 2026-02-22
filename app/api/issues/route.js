export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") || "";

  // Build the GitHub search query
  const query = lang && lang !== "All"
    ? `label:"good first issue" state:open language:${lang}`
    : `label:"good first issue" state:open`;

  const response = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const data = await response.json();
  return Response.json(data.items || []);
}