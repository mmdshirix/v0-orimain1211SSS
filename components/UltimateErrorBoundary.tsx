"use client"
import React from "react"

export class UltimateErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_e: any) {
    return { hasError: true }
  }

  componentDidCatch(e: any, info: any) {
    try {
      console.error("[UltimateBoundary]", e, info)
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div style={{ padding: 12, fontFamily: "sans-serif" }}>Widget error</div>
    }
    return this.props.children
  }
}
