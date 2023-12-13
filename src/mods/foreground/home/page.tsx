/* eslint-disable @next/next/no-img-element */
import { useBackgroundContext } from "@/mods/foreground/background/context"
import { PageBody, PageHeader } from "@/mods/foreground/components/page/header"
import { Page } from "@/mods/foreground/components/page/page"
import { useCallback, useEffect, useState } from "react"
import { useUserContext } from "../entities/users/context"
import { useTotalPricedBalance } from "../entities/wallets/data"
import { useDisplayUsd } from "../entities/wallets/page"

export function HomePage() {
  const userData = useUserContext().unwrap()
  const background = useBackgroundContext().unwrap()

  const totalPricedBalanceQuery = useTotalPricedBalance("usd")
  const totalPricedBalanceDisplay = useDisplayUsd(totalPricedBalanceQuery.current)

  useEffect(() => {
    background.tryRequest({ method: "brume_log" }).then(r => r.inspectErrSync(console.warn))
  }, [background])

  const [persisted, setPersisted] = useState<boolean>()

  const getPersisted = useCallback(async () => {
    setPersisted(await navigator.storage.persist())
  }, [])

  useEffect(() => {
    getPersisted()

    const t = setInterval(getPersisted, 1000)
    return () => clearTimeout(t)
  }, [getPersisted])

  const Body =
    <PageBody>
      <div className="text-center text-4xl font-medium">
        {`Hi, ${userData.name}`}
      </div>
      <div className="h-8" />
      <div className="text-lg font-medium">
        Total balance
      </div>
      <div className="text-2xl font-bold">
        {totalPricedBalanceDisplay}
      </div>
      <div className="h-4" />
      <div className="po-md border border-contrast h-[400px] rounded-xl flex flex-col items-center justify-center">
        <img src="/favicon.png" alt="logo" className="h-12 w-auto" />
        <div className="">
          Coming soon...
        </div>
      </div>
      <div className="h-8" />
      <div className="grow" />
      {persisted === false && <>
        <div className="text-lg font-medium">
          Alerts
        </div>
        <div className="h-2" />
        <div className="po-md border border-contrast rounded-xl">
          <h3 className="text-lg font-medium">
            Your storage is not persistent yet
          </h3>
          <p className="text-contrast">
            Please add this website to your favorites or to your home screen in order to enable persistent storage
          </p>
          <div className="h-2" />
        </div>
      </>}
    </PageBody>

  const Header =
    <PageHeader title="Home" />

  return <Page>
    {Header}
    {Body}
  </Page>
}