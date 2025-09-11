import Head from "next/head";
import getMongoClientPromise from "../lib/mongodb";

export const getServerSideProps = async () => {
  try {
    await getMongoClientPromise();

    return {
      props: { isConnected: true },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: false },
    };
  }
};

export default function Home({ isConnected }) {
  return (
    <div>
      <Head>
        <title>Redirecting...</title>
      </Head>
    </div>
  );
}
