import {redirect} from "next/navigation";

export default function ColumnDetailRedirect({params}: {params: Promise<{locale: string; slug: string}>}) {
  const RedirectComponent = async () => {
    const {slug} = await params;
    redirect(`/berita/${slug}`);
    return null;
  };
  return <RedirectComponent />;
}
