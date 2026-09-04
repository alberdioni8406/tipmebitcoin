import { notFound } from "next/navigation";
import { findHandleByNormalized } from "@/lib/database";
import { validateHandle, formatHandleDisplay } from "@/lib/handles";
import { PROJECT } from "@/config/project";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props) {
  const validation = validateHandle(params.handle);
  if (!validation.ok) return { title: "Not found" };
  const record = await findHandleByNormalized(validation.normalized);
  if (!record) return { title: "Not found" };
  return {
    title: formatHandleDisplay(record.normalizedHandle),
    description: record.bio || `Tip ${record.normalizedHandle} with Bitcoin Cash`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const validation = validateHandle(params.handle);
  if (!validation.ok) notFound();

  const record = await findHandleByNormalized(validation.normalized);
  if (!record || record.status !== "active") notFound();

  return (
    <ProfileClient
      handle={record.normalizedHandle}
      displayName={record.displayName}
      bio={record.bio}
      bchAddress={record.bchAddress}
      tokenAddress={record.tokenAddress}
      verified={record.verified}
      domain={PROJECT.domain}
    />
  );
}
