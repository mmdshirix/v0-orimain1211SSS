"use client"
import React from "react"

export class SafeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: String(err?.message || err) }
  }

  componentDidCatch(error: any, info: any) {
    console.error("[Widget ErrorBoundary]", error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div style={{ padding: 12, fontFamily: "sans-serif" }}>Widget error</div>
    }
    return this.props.children
  }
}
