import Head from "next/head";
import { useRouter } from "next/router";
import IndustrySelector from "../components/IndustrySelector";

export const getServerSideProps = async ({ query }) => {
  const { industry } = query;
  if (industry === "retail" || industry === "manufacturing") {
    return {
      redirect: {
        destination: `/${industry}/products`,
        permanent: false,
      },
    };
  }
  return { props: {} };
};

export default function Home() {
  return (
    <div>
      <Head>
        <title>Select Industry</title>
      </Head>
      <IndustrySelector />
    </div>
  );
}
