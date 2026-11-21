import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Plus,
  Lock,
  CheckCircle2,
  AlertTriangle,
  History,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  fetchCatalogOverview,
  fetchPublicRules,
  fetchTechnicianServices,
  selectTechnicianService,
  toggleTechnicianServiceActive,
  updateTechnicianServicePricing,
} from '../../services/financeApi';
import {
  subscribeToTechnicianServices,
  saveTechnicianServiceToFirestore,
  deleteTechnicianServiceFromFirestore,
  subscribeToSubcategories,
  subscribeToPricingRules,
  subscribeToPlatformRules,
} from '../../services/firestoreFinanceService';
import type {
  PricingRule,
  ServiceSubcategory,
  TechnicianPriceHistoryItem,
  TechnicianServiceConfig,
} from '../../types/finance';

interface Props {
  technicianId: string;
}

export const TechnicianPricingSection: React.FC<Props> = ({ technicianId }) => {
  const { authTokenReady, currentUser } = useAuth();
  const { isBangla } = useLanguage();
  const [services, setServices] = useState<TechnicianServiceConfig[]>([]);
  const [fsServices, setFsServices] = useState<TechnicianServiceConfig[]>([]);
  const [history, setHistory] = useState<TechnicianPriceHistoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [fsSubcategories, setFsSubcategories] = useState<ServiceSubcategory[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [fsPricingRules, setFsPricingRules] = useState<PricingRule[]>([]);
  const [publicRules, setPublicRules] = useState<any>(null);

  const [selectedSubToAdd, setSelectedSubToAdd] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, { price: number; visitingFee: number; hourlyRate: number; emergencyCharge: number }>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const formatPermLabel = (perm: string) => {
    switch (perm) {
      case 'ADMIN_CONTROLLED':
        return isBangla ? 'অ্যাডমিন নিয়ন্ত্রিত (লকড)' : 'Admin Controlled (Locked)';
      case 'TECH_CUSTOMIZABLE_RANGE':
        return isBangla ? 'নির্ধারিত রেঞ্জে পরিবর্তনযোগ্য' : 'Range Customizable';
      case 'TECH_CUSTOMIZABLE_APPROVAL':
        return isBangla ? 'অ্যাডমিন অনুমোদন সাপেক্ষে পরিবর্তনযোগ্য' : 'Approval Required';
      case 'FIXED_NO_CUSTOMIZATION':
        return isBangla ? 'নির্ধারিত প্ল্যাটফর্ম মূল্য' : 'Fixed Platform Rate';
      default:
        return perm;
    }
  };

  const formatServiceStatus = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return isBangla ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Pending Approval';
      case 'APPROVED':
        return isBangla ? 'অনুমোদিত' : 'Approved';
      case 'CUSTOMIZED_PRICE':
        return isBangla ? 'কাস্টমাইজড রেট সক্রিয়' : 'Customized Rate';
      case 'DEFAULT_RATE':
        return isBangla ? 'ডিফল্ট অ্যাডমিন রেট' : 'Default Rate';
      case 'REJECTED':
        return isBangla ? 'প্রত্যাখ্যাত' : 'Rejected';
      case 'INACTIVE':
        return isBangla ? 'নিষ্ক্রিয়' : 'Inactive';
      default:
        return status;
    }
  };

  useEffect(() => {
    const u1 = subscribeToTechnicianServices((list) => {
      setFsServices(list);
      setEdits((prev) => {
        const next = { ...prev };
        for (const s of list) {
          if (!next[s.id]) {
            next[s.id] = {
              price: s.pendingPrice ?? s.approvedPrice,
              visitingFee: s.pendingVisitingFee ?? s.approvedVisitingFee,
              hourlyRate: s.pendingHourlyRate ?? s.approvedHourlyRate,
              emergencyCharge: s.pendingEmergencyCharge ?? s.approvedEmergencyCharge,
            };
          }
        }
        return next;
      });
    }, technicianId);
    const u2 = subscribeToSubcategories((subs) => setFsSubcategories(subs));
    const u3 = subscribeToPricingRules((rules) => setFsPricingRules(rules));
    const u4 = subscribeToPlatformRules((rules) => {
      if (rules) setPublicRules(rules);
    });
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [technicianId]);

  const loadData = async () => {
    if (!authTokenReady) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const targetParam = currentUser?.role === 'ADMIN' ? technicianId : undefined;
      const [catRes, pubRes, techRes] = await Promise.all([
        fetchCatalogOverview(),
        fetchPublicRules(),
        fetchTechnicianServices(targetParam),
      ]);
      setSubcategories(catRes.subcategories || []);
      setPricingRules(catRes.pricingRules || []);
      setPublicRules(pubRes);
      setServices(techRes.services || []);
      setHistory(techRes.history || []);

      const initialEdits: Record<string, { price: number; visitingFee: number; hourlyRate: number; emergencyCharge: number }> = {};
      for (const s of techRes.services || []) {
        initialEdits[s.id] = {
          price: s.pendingPrice ?? s.approvedPrice,
          visitingFee: s.pendingVisitingFee ?? s.approvedVisitingFee,
          hourlyRate: s.pendingHourlyRate ?? s.approvedHourlyRate,
          emergencyCharge: s.pendingEmergencyCharge ?? s.approvedEmergencyCharge,
        };
      }
      setEdits((prev) => ({ ...initialEdits, ...prev }));

      const unadded = (catRes.subcategories || []).find(
        (sub) => !(techRes.services || []).some((s) => s.subcategoryId === sub.id)
      );
      if (unadded) setSelectedSubToAdd(unadded.id);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isBangla ? 'সার্ভিস ক্যাটালগ ও মূল্য লোড করা যায়নি।' : 'Unable to load your service catalog & pricing.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authTokenReady) return;
    void loadData();
  }, [technicianId, authTokenReady, currentUser?.id]);

  const mergedSubcategories = [
    ...fsSubcategories,
    ...subcategories.filter((s) => !fsSubcategories.some((fs) => fs.id === s.id)),
  ];
  const mergedPricingRules = [
    ...fsPricingRules,
    ...pricingRules.filter((r) => !fsPricingRules.some((fr) => fr.id === r.id)),
  ];
  const mergedServices = [
    ...fsServices,
    ...services.filter((s) => !fsServices.some((fs) => fs.id === s.id)),
  ];

  const handleAddService = async () => {
    if (!selectedSubToAdd) return;
    setErrorMsg(null);
    try {
      const apiRes: any = await selectTechnicianService(selectedSubToAdd).catch(() => null);
      const sub = mergedSubcategories.find((s) => s.id === selectedSubToAdd);
      const rule = mergedPricingRules.find((r) => r.subcategoryId === selectedSubToAdd || r.id === sub?.pricingRuleId);
      const newSvc: TechnicianServiceConfig = apiRes?.service || {
        id: `${technicianId}__${selectedSubToAdd}`,
        technicianId,
        categoryId: sub?.categoryId || rule?.categoryId || 'electrical',
        subcategoryId: selectedSubToAdd,
        pricingRuleId: rule?.id || sub?.pricingRuleId || '',
        serviceTitleEn: sub?.nameEn || rule?.serviceTitleEn || 'Service',
        serviceTitleBn: sub?.nameBn || rule?.serviceTitleBn || 'সার্ভিস',
        approvedPrice: rule?.defaultPrice || 500,
        approvedVisitingFee: rule?.visitingFee || 200,
        approvedHourlyRate: rule?.hourlyRate || 300,
        approvedAdditionalHourCharge: rule?.additionalHourCharge || 200,
        approvedEmergencyCharge: rule?.emergencyCharge || 250,
        approvedNightCharge: rule?.nightCharge || 150,
        approvedWeekendCharge: rule?.weekendCharge || 100,
        status: 'DEFAULT_PRICE',
        active: true,
        updatedAt: new Date().toISOString(),
      };
      await saveTechnicianServiceToFirestore(newSvc);
      notify(
        isBangla
          ? 'সার্ভিসটি অ্যাডমিনের ডিফল্ট রেটসহ ফায়ারবেসে যুক্ত হয়েছে।'
          : 'Service added with Admin default pricing & synced to Firebase.'
      );
      void loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'সার্ভিস যুক্ত করা যায়নি।' : 'Failed to add service.'));
    }
  };

  const handleSaveServicePrice = async (svc: TechnicianServiceConfig) => {
    const draft = edits[svc.id];
    if (!draft) return;
    setErrorMsg(null);
    try {
      const rule = mergedPricingRules.find((r) => r.id === svc.pricingRuleId);
      const res: any = await updateTechnicianServicePricing(svc.id, {
        price: draft.price,
        visitingFee: draft.visitingFee,
        hourlyRate: draft.hourlyRate,
        emergencyCharge: draft.emergencyCharge,
      }).catch(() => ({ needsApproval: Boolean(rule?.requiresPriceApproval) }));

      const needsApproval = Boolean(res?.needsApproval);
      const updatedSvc: TechnicianServiceConfig = {
        ...svc,
        ...(needsApproval
          ? {
              pendingPrice: draft.price,
              pendingVisitingFee: draft.visitingFee,
              pendingHourlyRate: draft.hourlyRate,
              pendingEmergencyCharge: draft.emergencyCharge,
              status: 'PENDING_APPROVAL',
            }
          : {
              approvedPrice: draft.price,
              approvedVisitingFee: draft.visitingFee,
              approvedHourlyRate: draft.hourlyRate,
              approvedEmergencyCharge: draft.emergencyCharge,
              pendingPrice: null,
              pendingVisitingFee: null,
              pendingHourlyRate: null,
              pendingEmergencyCharge: null,
              status: 'CUSTOMIZED_PRICE',
            }),
        updatedAt: new Date().toISOString(),
      };
      await saveTechnicianServiceToFirestore(updatedSvc);

      notify(
        needsApproval
          ? isBangla
            ? 'নতুন মূল্য অ্যাডমিন অনুমোদনের জন্য ফায়ারবেসে পাঠানো হয়েছে।'
            : 'Price submitted to Firebase for Admin Approval.'
          : isBangla
            ? 'সার্ভিস মূল্য সফলভাবে ফায়ারবেসে আপডেট ও সক্রিয় হয়েছে!'
            : 'Service price updated in Firebase & active!'
      );
      void loadData();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isBangla ? 'সার্ভার ভ্যালিডেশনে মূল্য পরিবর্তন প্রত্যাখ্যাত হয়েছে।' : 'Price customization rejected by backend validation.')
      );
    }
  };

  const handleToggleActive = async (svc: TechnicianServiceConfig) => {
    try {
      await toggleTechnicianServiceActive(svc.id, !svc.active).catch(() => null);
      await saveTechnicianServiceToFirestore({
        ...svc,
        active: !svc.active,
        status: !svc.active ? 'CUSTOMIZED_PRICE' : 'INACTIVE',
        updatedAt: new Date().toISOString(),
      });
      notify(
        svc.active
          ? isBangla
            ? 'সার্ভিসটি নিষ্ক্রিয় করা হয়েছে।'
            : 'Service deactivated.'
          : isBangla
            ? 'সার্ভিসটি সক্রিয় করা হয়েছে।'
            : 'Service activated.'
      );
      void loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'সার্ভিস স্ট্যাটাস পরিবর্তন করা যায়নি।' : 'Failed to toggle service status.'));
    }
  };

  const handleDeleteService = async (svc: TechnicianServiceConfig) => {
    setErrorMsg(null);
    try {
      await deleteTechnicianServiceFromFirestore(svc.id);
      setServices((prev) => prev.filter((item) => item.id !== svc.id));
      notify(
        isBangla
          ? `"${svc.serviceTitleBn || svc.serviceTitleEn}" ফায়ারবেস থেকে মুছে ফেলা হয়েছে।`
          : `"${svc.serviceTitleEn}" removed from Firebase.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'সার্ভিস মুছে ফেলা যায়নি।' : 'Failed to remove service.'));
    }
  };

  const globalCustomAllowed = publicRules?.general?.allowPriceCustomization !== false;
  const unconfiguredSubs = mergedSubcategories.filter((sub) => !mergedServices.some((s) => s.subcategoryId === sub.id));

  if (loading && services.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-zinc-500">
        {isBangla ? 'আপনার সার্ভিস ও প্রাইসিং তথ্য লোড হচ্ছে...' : 'Loading My Services & Pricing...'}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
              <span>
                {isBangla ? 'আমার সার্ভিসসমূহ ও অ্যাডমিন-নিয়ন্ত্রিত মূল্য তালিকা' : 'My Services & Admin-Governed Pricing'}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
              {isBangla
                ? 'ডিফল্ট মূল্য এবং সর্বনিম্ন/সর্বোচ্চ সীমা Servexa অ্যাডমিন রুলস থেকে নির্ধারিত। কমিশন: ৯০% টেকনিশিয়ান / ১০% Servexa।'
                : 'Default prices & min/max limits come from Servexa Admin rules. Commission: 90% Technician / 10% Servexa.'}
            </p>
          </div>
          {!globalCustomAllowed && (
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{isBangla ? 'মূল্য পরিবর্তন অ্যাডমিন কর্তৃক লক করা' : 'Global Customization Locked by Admin'}</span>
            </span>
          )}
        </div>

        {/* Add Service from Catalog */}
        {unconfiguredSubs.length > 0 && (
          <div className="p-3 sm:p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 text-xs">
            <select
              value={selectedSubToAdd}
              onChange={(e) => setSelectedSubToAdd(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-bold"
            >
              {unconfiguredSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {isBangla ? `${sub.nameBn} (${sub.nameEn})` : `${sub.nameEn} (${sub.nameBn})`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAddService()}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBangla ? 'সার্ভিস যুক্ত করুন (ডিফল্ট রেট লোড হবে)' : 'Add Service (Loads Admin Default Rate)'}</span>
            </button>
          </div>
        )}

        {toast && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Services List */}
        <div className="space-y-4">
          {mergedServices.map((svc) => {
            const rule = mergedPricingRules.find((r) => r.id === svc.pricingRuleId);
            const isLocked =
              !globalCustomAllowed ||
              rule?.customizationPermission === 'FIXED_NO_CUSTOMIZATION' ||
              rule?.customizationPermission === 'ADMIN_CONTROLLED';
            const draft = edits[svc.id] || {
              price: svc.approvedPrice,
              visitingFee: svc.approvedVisitingFee,
              hourlyRate: svc.approvedHourlyRate,
              emergencyCharge: svc.approvedEmergencyCharge,
            };

            return (
              <div
                key={svc.id}
                className="p-3 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5 sm:space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-black text-sm text-zinc-900 dark:text-white">
                      {isBangla ? svc.serviceTitleBn : svc.serviceTitleEn}{' '}
                      <span className="text-zinc-500 font-bold">
                        · {isBangla ? svc.serviceTitleEn : svc.serviceTitleBn}
                      </span>
                    </div>
                    {rule && (
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {isBangla
                          ? `অ্যাডমিন সীমা: ৳${rule.minPrice}–৳${rule.maxPrice} (ডিফল্ট ৳${rule.defaultPrice}) · ধরন: ${formatPermLabel(rule.customizationPermission)}`
                          : `Admin Range: ৳${rule.minPrice}–৳${rule.maxPrice} (Default ৳${rule.defaultPrice}) · Mode: ${formatPermLabel(rule.customizationPermission)}`}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        svc.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-600'
                          : svc.status === 'REJECTED' || svc.status === 'INACTIVE'
                          ? 'bg-rose-500/15 text-rose-600'
                          : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      {formatServiceStatus(svc.status)}
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleToggleActive(svc)}
                      className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 cursor-pointer flex items-center gap-1 font-bold"
                    >
                      {svc.active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-zinc-400" />}
                      <span>{svc.active ? (isBangla ? 'সক্রিয়' : 'Active') : (isBangla ? 'নিষ্ক্রিয়' : 'Inactive')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteService(svc)}
                      title={isBangla ? 'সার্ভিস মুছুন' : 'Delete Service'}
                      aria-label={isBangla ? 'সার্ভিস মুছুন' : 'Delete Service'}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {svc.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 font-bold">
                    {isBangla ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection Note:'} {svc.rejectionReason}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      {isBangla ? 'সার্ভিস মূল্য (৳)' : 'Service Price (৳)'} {isLocked && '🔒'}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={draft.price}
                      onChange={(e) =>
                        setEdits({ ...edits, [svc.id]: { ...draft, price: Number(e.target.value) } })
                      }
                      className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-black disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      {isBangla ? 'ভিজিটিং ফি (৳)' : 'Visiting Fee (৳)'}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={draft.visitingFee}
                      onChange={(e) =>
                        setEdits({ ...edits, [svc.id]: { ...draft, visitingFee: Number(e.target.value) } })
                      }
                      className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-black disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      {isBangla ? 'ঘণ্টাভিত্তিক রেট (৳)' : 'Hourly Rate (৳)'}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={draft.hourlyRate}
                      onChange={(e) =>
                        setEdits({ ...edits, [svc.id]: { ...draft, hourlyRate: Number(e.target.value) } })
                      }
                      className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-black disabled:opacity-60"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => void handleSaveServicePrice(svc)}
                      className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-400 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {rule?.requiresPriceApproval
                          ? isBangla
                            ? 'অনুমোদনের জন্য পাঠান'
                            : 'Submit for Approval'
                          : isBangla
                            ? 'মূল্য সংরক্ষণ করুন'
                            : 'Save Price'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Change History */}
      {history.length > 0 && (
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
          <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            <span>{isBangla ? 'মূল্য পরিবর্তনের ইতিহাস' : 'Price Change History'}</span>
          </h4>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
            {history.map((h) => {
              const matchedSvc = mergedServices.find((s) => s.serviceTitleEn === h.serviceTitleEn);
              const historyTitle = isBangla ? (matchedSvc?.serviceTitleBn || h.serviceTitleEn) : h.serviceTitleEn;
              const fieldLabel =
                h.field === 'SERVICE_PRICE'
                  ? isBangla
                    ? 'সার্ভিস মূল্য'
                    : 'Service Price'
                  : h.field === 'VISITING_FEE'
                    ? isBangla
                      ? 'ভিজিটিং ফি'
                      : 'Visiting Fee'
                    : h.field;
              return (
              <div key={h.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {historyTitle} ({fieldLabel})
                  </div>
                  <div className="text-[11px] text-zinc-400">{h.note}</div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold">৳{h.previousValue} → ৳{h.newValue}</span>
                  <div className="text-[10px] text-emerald-600 font-bold">{formatServiceStatus(h.status)}</div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
