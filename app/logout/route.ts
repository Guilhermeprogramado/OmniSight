import { signOut } from "@workos-inc/authkit-nextjs";

export const GET = async (request: Request) => {
  const returnTo = new URL("/", request.url).toString();
  return signOut({ returnTo });
};
