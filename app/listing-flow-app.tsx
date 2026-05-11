"use client";

import { FormEvent, useMemo, useState } from "react";
import { hasSubscriptionAccess, readableSubscriptionStatus } from "@/lib/subscription";
import type { GenerationRecord, ListingFormInput, UserProfile } from "@/lib/types";

const emptyForm: ListingFormInput = {
  propertyAddress: "",
  bedrooms: "",
  bathrooms: "",
  price: "",
  features: ["", "", ""],
  targetBuyerType: "",
};

type Props = {
  initialHistory: GenerationRecord[];
  initialProfile: UserProfile | null;
};

export default function ListingFlowApp({ initialHistory, initialProfile }: Props) {
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [form, setForm] = useState<ListingFormInput>(emptyForm);
  const [history, setHistory] = useState(initialHistory);
  const [selectedId, setSelectedId] = useState(initialHistory[0]?.id ?? null);
  const [latestResult, setLatestResult] = useState<GenerationRecord | null>(initialHistory[0] ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canGenerate = hasSubscriptionAccess(initialProfile);
  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedId) ?? history[0] ?? null,
    [history, selectedId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { generation?: GenerationRecord; error?: string };

      if (!response.ok || !payload.generation) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setLatestResult(payload.generation);
      setHistory((current) => [payload.generation!, ...current]);
      setSelectedId(payload.generation.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function openBilling(path: "/api/stripe/checkout" | "/api/stripe/portal") {
    setError(null);
    setIsBillingLoading(true);

    try {
      const response = await fetch(path, { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Could not start billing session.");
      }

      window.location.href = payload.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start billing session.");
      setIsBillingLoading(false);
    }
  }

  return (
    <section className="app-wrap">
      <div className="tabs" aria-label="ListingFlow sections">
        <button
          className={`tab ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
          type="button"
        >
          Generate
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
          type="button"
        >
          History
        </button>
      </div>

      {activeTab === "create" ? (
        <div className="grid">
          <div className="card">
            <div className="card-header">
              <h2>Property details</h2>
              <p className="muted">
                Subscription: {readableSubscriptionStatus(initialProfile?.subscriptionStatus ?? "none")}
              </p>
            </div>

            {!canGenerate ? (
              <div className="notice" style={{ marginBottom: 18 }}>
                <strong>Start your 7-day free trial.</strong>
                <span>$49/month after trial. A subscription is required to generate content.</span>
                <button
                  className="button"
                  disabled={isBillingLoading}
                  onClick={() => openBilling("/api/stripe/checkout")}
                  type="button"
                >
                  {isBillingLoading ? "Opening..." : "Start trial"}
                </button>
              </div>
            ) : (
              <div className="notice" style={{ marginBottom: 18 }}>
                <strong>Your ListingFlow subscription is active.</strong>
                <button
                  className="button secondary"
                  disabled={isBillingLoading}
                  onClick={() => openBilling("/api/stripe/portal")}
                  type="button"
                >
                  Manage subscription
                </button>
              </div>
            )}

            <form className="form" onSubmit={handleSubmit}>
              <Field label="Property address">
                <input
                  value={form.propertyAddress}
                  onChange={(event) => setForm({ ...form, propertyAddress: event.target.value })}
                  placeholder="123 Palm Avenue, Austin, TX"
                  required
                />
              </Field>

              <div className="inline-fields">
                <Field label="Bedrooms">
                  <input
                    value={form.bedrooms}
                    onChange={(event) => setForm({ ...form, bedrooms: event.target.value })}
                    placeholder="4"
                    required
                  />
                </Field>
                <Field label="Bathrooms">
                  <input
                    value={form.bathrooms}
                    onChange={(event) => setForm({ ...form, bathrooms: event.target.value })}
                    placeholder="3.5"
                    required
                  />
                </Field>
              </div>

              <Field label="Price">
                <input
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="$849,000"
                  required
                />
              </Field>

              {form.features.map((feature, index) => (
                <Field key={index} label={`Key feature ${index + 1}`}>
                  <input
                    value={feature}
                    onChange={(event) => {
                      const features = [...form.features] as [string, string, string];
                      features[index] = event.target.value;
                      setForm({ ...form, features });
                    }}
                    placeholder={featurePlaceholder(index)}
                    required
                  />
                </Field>
              ))}

              <Field label="Target buyer type">
                <input
                  value={form.targetBuyerType}
                  onChange={(event) => setForm({ ...form, targetBuyerType: event.target.value })}
                  placeholder="Growing families relocating from the city"
                  required
                />
              </Field>

              {error ? <p className="error">{error}</p> : null}

              <button className="button" disabled={!canGenerate || isGenerating} type="submit">
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </form>
          </div>

          <GeneratedResults generation={latestResult} />
        </div>
      ) : (
        <div className="history-grid">
          <div className="card">
            <div className="card-header">
              <h2>Past generations</h2>
              <p className="muted">Your latest 25 saved ListingFlow outputs.</p>
            </div>
            {history.length ? (
              <div className="history-list">
                {history.map((item) => (
                  <button
                    className={`history-item ${item.id === selectedHistory?.id ? "active" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    <strong>{item.propertyAddress}</strong>
                    <br />
                    <span className="muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">No generations yet.</div>
            )}
          </div>
          <GeneratedResults generation={selectedHistory} />
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function GeneratedResults({ generation }: { generation: GenerationRecord | null }) {
  if (!generation) {
    return (
      <div className="card">
        <div className="empty">Generated MLS copy, social captions, and email drip content will appear here.</div>
      </div>
    );
  }

  return (
    <div className="card results">
      <div className="card-header">
        <h2>Generated results</h2>
        <p className="muted">{generation.propertyAddress}</p>
      </div>

      <section className="result-section">
        <h3>MLS-ready listing description</h3>
        <p>{generation.listingDescription}</p>
      </section>

      <section className="result-section">
        <h3>Social media captions</h3>
        <ul>
          <li>
            <strong>Instagram:</strong> {generation.socialCaptions.instagram}
          </li>
          <li>
            <strong>Facebook:</strong> {generation.socialCaptions.facebook}
          </li>
          <li>
            <strong>LinkedIn:</strong> {generation.socialCaptions.linkedin}
          </li>
        </ul>
      </section>

      <section className="result-section">
        <h3>5-email follow-up drip sequence</h3>
        <ol>
          {generation.dripSequence.map((email, index) => (
            <li key={`${email.subject}-${index}`}>
              <strong>{email.subject}</strong>
              <p>{email.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function featurePlaceholder(index: number) {
  return ["Chef's kitchen", "Resort-style pool", "Walkable neighborhood"][index] ?? "Feature";
}
