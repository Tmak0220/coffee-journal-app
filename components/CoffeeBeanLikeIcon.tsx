type Props = {
  active?: boolean
  className?: string
}

export default function CoffeeBeanLikeIcon({ active = false, className = "size-6" }: Props) {
  return (
    <svg className={className} viewBox="0 0 40 44" fill="none" aria-hidden="true" overflow="visible">
      <path
        d="M28.2 4.5C20.7.7 10.5 4.4 5.6 13.8.8 23 2.9 33.7 10.4 37.5c7.5 3.8 17.8-.5 22.6-9.8 4.7-9.2 2.7-19.4-4.8-23.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.08 : 0}
      />
      <path
        d="M27.2 5.1c-2.3 5.8-7.4 8.2-10.9 12.4-4.1 4.9-4.9 11-3.5 19.3"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.16"
        transform="translate(1.1 0.2)"
      />
      <path
        d="M27.2 5.1c-2.3 5.8-7.4 8.2-10.9 12.4-4.1 4.9-4.9 11-3.5 19.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
