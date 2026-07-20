"use client";

import { useEffect, useState } from "react";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { Modal } from "@/components/Modal";

type RestaurantSummary = { id: string; name: string };

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_ITEM";
  discountValue: number | null;
  maxRedemptions: number | null;
  expiresAt: string | null;
  _count?: { redemptions: number };
};

type Campaign = {
  id: string;
  scope: "NATIONAL" | "LOCAL";
  restaurantId: string | null;
  name: string;
  description: string | null;
  status: (typeof STATUSES)[number]["key"];
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  allRestaurants: boolean;
  restaurant: { id: string; name: string } | null;
  createdBy: { id: string; username: string } | null;
  targets: { restaurant: { id: string; name: string } }[];
  _count: { coupons: number };
};

type CampaignDetail = Campaign & { coupons: Coupon[] };

const STATUSES = [
  { key: "DRAFT", label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  { key: "ACTIVE", label: "Active", color: "bg-green-100 text-green-700" },
  { key: "PAUSED", label: "En pause", color: "bg-amber-100 text-amber-700" },
  { key: "ENDED", label: "Terminée", color: "bg-gray-100 text-gray-500" },
] as const;

const DISCOUNT_LABELS: Record<Coupon["discountType"], string> = {
  PERCENT: "%",
  FIXED_AMOUNT: "€",
  FREE_ITEM: "offert",
};

function statusMeta(status: string) {
  return STATUSES.find((s) => s.key === status) ?? STATUSES[0];
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
}

function canManage(hasGlobalAccess: boolean, activeRestaurantId: string | null, campaign: Campaign): boolean {
  if (campaign.scope === "NATIONAL") return hasGlobalAccess;
  if (hasGlobalAccess) return activeRestaurantId === campaign.restaurantId;
  return true;
}

export function CampagnesClient({
  hasGlobalAccess,
  canCreateLocal,
  activeRestaurantId,
  restaurants,
}: {
  hasGlobalAccess: boolean;
  canCreateLocal: boolean;
  activeRestaurantId: string | null;
  restaurants: RestaurantSummary[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CampaignDetail | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [scope, setScope] = useState<"LOCAL" | "NATIONAL">(canCreateLocal ? "LOCAL" : "NATIONAL");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [allRestaurants, setAllRestaurants] = useState(true);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<Coupon["discountType"]>("PERCENT");
  const [couponValue, setCouponValue] = useState("");
  const [couponMax, setCouponMax] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  async function loadList() {
    const res = await fetch("/api/campaigns");
    if (res.ok) setCampaigns(await res.json());
    setLoadingList(false);
  }

  async function loadSelected(id: string) {
    const res = await fetch(`/api/campaigns/${id}`);
    if (res.ok) setSelected(await res.json());
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId);
    else setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          name,
          description: description || undefined,
          budget: budget ? Number(budget) : undefined,
          allRestaurants: scope === "NATIONAL" ? allRestaurants : true,
          targetRestaurantIds: scope === "NATIONAL" && !allRestaurants ? targetIds : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || "Erreur lors de la création");
        return;
      }
      const created = await res.json();
      setShowCreate(false);
      setName("");
      setDescription("");
      setBudget("");
      setAllRestaurants(true);
      setTargetIds([]);
      await loadList();
      setSelectedId(created.id);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/campaigns/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadSelected(selectedId);
      await loadList();
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setCreatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          discountType: couponType,
          discountValue: couponValue ? Number(couponValue) : undefined,
          maxRedemptions: couponMax ? Number(couponMax) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCouponError(data.error || "Erreur lors de la création du coupon");
        return;
      }
      setCouponCode("");
      setCouponValue("");
      setCouponMax("");
      await loadSelected(selectedId);
    } finally {
      setCreatingCoupon(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campagnes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {hasGlobalAccess ? "Campagnes nationales et locales du réseau." : "Vos campagnes et les campagnes nationales en cours."}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle campagne
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:w-96">
          {loadingList ? (
            <p className="p-4 text-sm text-gray-500">Chargement...</p>
          ) : campaigns.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Aucune campagne</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {campaigns.map((c) => {
                const meta = statusMeta(c.status);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedId === c.id ? "bg-brand-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">{c.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{c.scope === "NATIONAL" ? "Réseau" : c.restaurant?.name ?? "—"}</span>
                        <span>{c.budget != null ? `${c.budget} €` : ""}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white">
          {!selected ? (
            <p className="p-6 text-sm text-gray-400">Sélectionne une campagne.</p>
          ) : (
            <div>
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selected.name}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {selected.scope === "NATIONAL" ? "Campagne nationale" : selected.restaurant?.name}
                      {selected.createdBy ? ` · ${selected.createdBy.username}` : ""}
                    </p>
                  </div>
                  {canManage(hasGlobalAccess, activeRestaurantId, selected) ? (
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-auto text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(selected.status).color}`}>
                      {statusMeta(selected.status).label}
                    </span>
                  )}
                </div>
                {selected.description && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{selected.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {selected.budget != null && <span>Budget : {selected.budget} €</span>}
                  {selected.startDate && <span>Du {formatDate(selected.startDate)}</span>}
                  {selected.endDate && <span>Au {formatDate(selected.endDate)}</span>}
                  {selected.scope === "NATIONAL" && (
                    <span>
                      {selected.allRestaurants
                        ? "Tous les restaurants"
                        : `${selected.targets.length} restaurant(s) ciblé(s)`}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <TicketIcon className="h-4 w-4 text-gray-400" aria-hidden />
                  Coupons
                </h3>
                {selected.coupons.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun coupon pour l&apos;instant.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Remise</th>
                          <th>Utilisations</th>
                          <th>Expire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.coupons.map((c) => (
                          <tr key={c.id}>
                            <td className="font-medium">{c.code}</td>
                            <td>
                              {c.discountType === "FREE_ITEM"
                                ? "Article offert"
                                : `${c.discountValue ?? "—"} ${DISCOUNT_LABELS[c.discountType]}`}
                            </td>
                            <td>
                              {c._count?.redemptions ?? 0}
                              {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                            </td>
                            <td>{formatDate(c.expiresAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {canManage(hasGlobalAccess, activeRestaurantId, selected) && (
                  <form onSubmit={handleCreateCoupon} className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Code</label>
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-32 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as Coupon["discountType"])}
                        className="text-sm"
                      >
                        <option value="PERCENT">Pourcentage</option>
                        <option value="FIXED_AMOUNT">Montant fixe</option>
                        <option value="FREE_ITEM">Article offert</option>
                      </select>
                    </div>
                    {couponType !== "FREE_ITEM" && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Valeur</label>
                        <input
                          type="number"
                          value={couponValue}
                          onChange={(e) => setCouponValue(e.target.value)}
                          className="w-24 text-sm"
                          min={0}
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Max utilisations</label>
                      <input
                        type="number"
                        value={couponMax}
                        onChange={(e) => setCouponMax(e.target.value)}
                        className="w-28 text-sm"
                        min={1}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingCoupon}
                      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {creatingCoupon ? "..." : "Ajouter"}
                    </button>
                    {couponError && <p className="w-full text-sm text-red-600">{couponError}</p>}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Nouvelle campagne" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {hasGlobalAccess && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Portée</label>
                <select value={scope} onChange={(e) => setScope(e.target.value as "LOCAL" | "NATIONAL")} className="w-full">
                  {canCreateLocal && <option value="LOCAL">Locale (restaurant actif)</option>}
                  <option value="NATIONAL">Nationale</option>
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description (optionnel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Budget (optionnel)</label>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full" min={0} />
            </div>

            {scope === "NATIONAL" && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={allRestaurants}
                    onChange={(e) => setAllRestaurants(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Diffuser à tous les restaurants
                </label>
                {!allRestaurants && (
                  <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
                    {restaurants.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={targetIds.includes(r.id)}
                          onChange={(e) =>
                            setTargetIds((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)))
                          }
                          className="h-4 w-4"
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
