import { Color } from "@/libs/colors/colors"
import { Outline } from "@/libs/icons"
import { getSeedEmoji, SeedData } from "@/mods/universal/entities/seeds"
import { useCoords, useHashSubpath, usePathContext } from "@hazae41/chemin"
import { useCallback, useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { CircularWhiteAnchorInColoredCard, CircularWhiteButtonInColoredCard } from "../wallets/card"
import { useSeedDataContext } from "./context"

export function RawSeedDataCard(props: { href?: string } & { index?: number } & { flip?: boolean } & { unflip?: () => void }) {
  const seed = useSeedDataContext().getOrThrow()
  const { href, index, flip, unflip } = props

  return <RawSeedCard
    type={seed.type}
    name={seed.name}
    color={Color.get(seed.color)}
    flip={flip}
    unflip={unflip}
    index={index}
    href={href} />
}

export function RawSeedCard(props: { type?: SeedData["type"] } & { name: string } & { color: Color } & { href?: string } & { index?: number } & { flip?: boolean } & { unflip?: () => void }) {
  const path = usePathContext().getOrThrow()
  const { type, name, color, href, index, flip, unflip } = props

  const hash = useHashSubpath(path)
  const coords = useCoords(hash, href)

  const [preflip = false, setPreflip] = useState(flip)
  const [postflip, setPostflip] = useState(false)

  const onFlipTransitionEnd = useCallback(() => {
    flushSync(() => setPostflip(preflip))
  }, [preflip])

  useEffect(() => {
    if (preflip)
      return
    if (postflip)
      return
    unflip?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflip, postflip])

  const First =
    <div className="flex items-center">
      <div className="flex-none text-xl">
        {type && getSeedEmoji(type)}
      </div>
      <div className="w-2 grow" />
      {index == null && href != null &&
        <CircularWhiteAnchorInColoredCard
          onKeyDown={coords.onKeyDown}
          onClick={coords.onClick}
          href={coords.href}
          color={color}>
          <Outline.EllipsisHorizontalIcon className="size-4" />
        </CircularWhiteAnchorInColoredCard>}
      {index != null && index !== -1 &&
        <div className={`border-2 border-white flex items-center justify-center rounded-full overflow-hidden`}>
          <div className={`bg-blue-600 flex items-center justify-center size-5 text-white font-medium`}>
            {index + 1}
          </div>
        </div>}
      {index != null && index === -1 &&
        <div className={`border-2 border-default-contrast flex items-center justify-center rounded-full`}>
          <div className="size-5" />
        </div>}
    </div>

  const Name =
    <div className="flex items-center text-white font-medium">
      <div className="truncate">
        {name}
      </div>
    </div>

  return <div className="w-full h-full [perspective:1000px]">
    <div className={`relative z-10 w-full h-full text-white bg-${color}-400 dark:bg-${color}-500 rounded-xl ${preflip && !postflip ? "animate-flip-in" : ""} ${!preflip && postflip ? "animate-flip-out" : ""}`}
      style={{ transform: preflip && postflip ? `rotateY(180deg)` : "", transformStyle: "preserve-3d" }}
      onAnimationEnd={onFlipTransitionEnd}>
      <div className="po-2 absolute w-full h-full flex flex-col [backface-visibility:hidden]"
        onContextMenu={coords.onContextMenu}>
        {First}
        <div className="grow" />
        {Name}
      </div>
      <div className="po-2 absolute w-full h-full flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]"
        onContextMenu={coords.onContextMenu}>
        <div className="flex items-center">
          <div className="w-2 grow" />
          <CircularWhiteButtonInColoredCard
            onClick={() => setPreflip?.(false)}
            color={color}>
            <Outline.ArrowLeftIcon className="size-4" />
          </CircularWhiteButtonInColoredCard>
        </div>
        <div className="grow" />
      </div>
    </div>
  </div>
}
