import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findHandleByNormalized } from "@/lib/database";
import { validateHandle, formatHandleDisplay } from "@/lib/handles";
import { PROJECT } from "@/config/project";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const base = PROJECT.appUrl;

  if (params.handle.toLowerCase() === "demo") {
    return {
      title: "@DEMO",
      description: "Demo TipMeBitcoin profile",
      openGraph: {
        title: "@DEMO · TipMeBitcoin",
        description: "Demo TipMeBitcoin profile — tip with Bitcoin Cash",
        url: `${base}/demo`,
        siteName: PROJECT.name,
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: "@DEMO · TipMeBitcoin",
        description: "Demo TipMeBitcoin profile — tip with Bitcoin Cash",
      },
    };
  }

  const validation = validateHandle(params.handle);
  if (!validation.ok) {
    return { title: "Not found", robots: { index: false } };
  }

  try {
    const record = await findHandleByNormalized(validation.normalized);
    if (!record) {
      return { title: "Not found", robots: { index: false } };
    }
    const title = formatHandleDisplay(record.normalizedHandle);
    const description =
      record.bio ||
      `Tip ${record.normalizedHandle} with Bitcoin Cash on TipMeBitcoin`;
    const url = `\( {base}/ \){record.normalizedHandle}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${title} · TipMeBitcoin`,
        description,
        url,
        siteName: PROJECT.name,
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: `${title} · TipMeBitcoin`,
        description,
      },
    };
  } catch {
    return { title: "TipMeBitcoin" };
  }
}

export default async function ProfilePage({ params }: Props) {
  if (params.handle.toLowerCase() === "demo") {
    return (
      <ProfileClient
        handle="demo"
        displayName="Demo Profile"
        bio="Static demonstration profile. Claim a real handle to create your own."
        bchAddress={PROJECT.PROJECT_DONATION_BCH_ADDRESS}
        tokenAddress={PROJECT.PROJECT_DONATION_BCH_ADDRESS}
        verified={true}
        appUrl={PROJECT.appUrl}
      />
    );
  }

  const validation = validateHandle(params.handle);
  if (!validation.ok) notFound();

  let record;
  try {
    record = await findHandleByNormalized(validation.normalized);
  } catch {
    notFound();
  }

  if (!record || record.status !== "active") notFound();

  return (
    <ProfileClient
      handle={record.normalizedHandle}
      displayName={record.displayName}
      bio={record.bio}
      bchAddress={record.bchAddress}
      tokenAddress={record.tokenAddress}
      verified={record.verified}
      appUrl={PROJECT.appUrl}
    />
  );
}
