// Only these published read endpoints are available without a session cookie.
export function isPublicCatalogRead(method: string, path: string[]) {
  return method === "GET" && path[0] === "catalog" && (
    (path.length === 2 && ["programs", "routines", "categories"].includes(path[1])) ||
    (path.length === 3 && ["programs", "routines"].includes(path[1]) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[2]))
  );
}
