import Head from 'next/head'
import { getClientPromise } from '../lib/mongodb'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'
import { useEffect } from 'react';
import { useRouter } from 'next/router';

type ConnectionStatus = {
  isConnected: boolean
}

export const getServerSideProps: GetServerSideProps<
  ConnectionStatus
> = async () => {
  try {
    await getClientPromise();

    return {
      props: { isConnected: true },
    }
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: false },
    }
  }
}

export default function Home({
  isConnected,
}: ConnectionStatus) {

  return (
    <div>
      <Head>
        <title>Redirecting...</title>
      </Head>
    </div>
  )
}






