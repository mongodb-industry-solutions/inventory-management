import Head from 'next/head'
import clientPromise from '../lib/mongodb'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'
import { FaSearch } from 'react-icons/fa';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

type ConnectionStatus = {
  isConnected: boolean
}

export const getServerSideProps: GetServerSideProps<
  ConnectionStatus
> = async () => {
  try {
    await clientPromise

    return {
      props: { isConnected: true },
    }
  } catch (e) {
    console.error(e)
    return {
      props: { isConnected: false },
    }
  }
}

export default function Home({
  isConnected,
}: ConnectionStatus) {
  const router = useRouter();

  useEffect(() => {
    router.push('/products');
  }, []);

  return (
    <div>
      <Head>
        <title>Redirecting...</title>
      </Head>
      <div className="search-bar">
        <input className="search-input" type="text" placeholder=" Search..." />
        <button className="search-button">
          <FaSearch />
        </button>
      </div>
    </div>
  )
}






