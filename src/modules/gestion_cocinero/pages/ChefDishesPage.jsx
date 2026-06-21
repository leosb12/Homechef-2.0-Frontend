import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { uploadFile } from "../../../shared/services/uploads";
import {
  createChefDish,
  deleteChefDish,
  fetchChefDishes,
  updateChefDish,
} from "../services/chef_service";
import LoadingButton from "../components/LoadingButton";
import SearchableSelect from "../components/SearchableSelect";
import { ALERGENOS, INGREDIENTES, ETIQUETAS } from "../constants";
import {
  clearChatbotPageContext,
  setChatbotPageContext,
} from "../../user_manual_chatbot/services/chatbotPageContext";

const STATUS_LABELS = {
  published: "Publicado",
  draft: "Borrador",
  paused: "Pausado",
  sold_out: "Agotado",
};

const DISH_STATUS_OPTIONS = [
  { value: "published", label: "Publicado" },
  { value: "draft", label: "Borrador" },
  { value: "paused", label: "Pausado" },
];

function emptyForm() {
  return {
    _id: "",
    name: "",
    description: "",
    price: "",
    portions: "",
    schedule: "",
    ingredients: [],
    tags: [],
    allergens: [],
    image_url: "",
    status: "draft",
  };
}

function normalizeDish(dish) {
  return {
    _id: dish._id || "",
    name: dish.name || "",
    description: dish.description || "",
    price: String(dish.price ?? ""),
    portions: String(dish.portions ?? ""),
    schedule: dish.schedule || "",
    ingredients: Array.isArray(dish.ingredients)
      ? dish.ingredients.map((i) =>
          typeof i === "string" ? { name: i, quantity: 1, unit: "u" } : i,
        )
      : [],
    tags: Array.isArray(dish.tags) ? dish.tags : [],
    allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
    image_url: dish.image_url || "",
    status: dish.status || "draft",
  };
}

export default function ChefDishesPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState(emptyForm());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const fileInputRef = useRef(null);
  const location = useLocation();

  const load = async () => {
    try {
      const data = await fetchChefDishes();
      const nextItems = data.items || [];
      setItems(nextItems);
      if (selectedId) {
        const found = nextItems.find((x) => x._id === selectedId);
        if (found) {
          setForm(normalizeDish(found));
        } else {
          setSelectedId("");
          setForm(emptyForm());
        }
      }
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.detail || "No se pudo cargar platos.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.suggestedDish) {
      const suggested = location.state.suggestedDish;
      setForm((prev) => ({
        ...prev,
        name: suggested.name || "",
        description: suggested.description || "",
        price: String(suggested.price ?? ""),
        portions: String(suggested.portions ?? ""),
        ingredients: Array.isArray(suggested.ingredients) ? suggested.ingredients : [],
        tags: Array.isArray(suggested.tags) ? suggested.tags : [],
        schedule: suggested.schedule || "",
      }));
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTab = activeTab === "all" ? true : item.status === activeTab;
      const matchesSearch = q
        ? (item.name || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q)
        : true;
      return matchesTab && matchesSearch;
    });
  }, [items, search, activeTab]);

  const counters = useMemo(() => {
    const base = { all: items.length, published: 0, draft: 0, paused: 0 };
    items.forEach((x) => {
      if (x.status === "published") base.published += 1;
      if (x.status === "draft") base.draft += 1;
      if (x.status === "paused") base.paused += 1;
    });
    return base;
  }, [items]);

  useEffect(() => {
    setChatbotPageContext(
      "/chef/dishes",
      {
        visible_dishes: filteredItems.map(toChatbotDishContext),
        all_dishes: items.map(toChatbotDishContext),
        dish_counters: counters,
        active_filter: activeTab,
        search_query: search,
      },
      "Mis platos",
    );
    return () => clearChatbotPageContext("/chef/dishes");
  }, [activeTab, counters, filteredItems, items, search]);

  const setNotice = (text, error = false) => {
    setIsError(error);
    setMessage(text);
  };

  const onNewDish = () => {
    setLoadingAction("new-dish");
    setSelectedId("");
    setForm(emptyForm());
    window.setTimeout(
      () =>
        setLoadingAction((current) => (current === "new-dish" ? "" : current)),
      150,
    );
  };

  const onSelectDish = (dish) => {
    setLoadingAction(`select-${dish._id}`);
    setSelectedId(dish._id);
    setForm(normalizeDish(dish));
    window.setTimeout(
      () =>
        setLoadingAction((current) =>
          current === `select-${dish._id}` ? "" : current,
        ),
      150,
    );
  };

  const onPickImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadFile(file, "dish");
      setForm((prev) => ({
        ...prev,
        image_url: uploaded.public_url || uploaded.file_path,
      }));
      setNotice("Imagen subida correctamente.");
    } catch (err) {
      setNotice(
        err?.response?.data?.detail ||
          err?.message ||
          "No se pudo subir la imagen.",
        true,
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const onRemoveImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists
          ? current.filter((x) => x !== value)
          : [...current, value],
      };
    });
  };

  const saveDish = async ({ publish }) => {
    setLoadingAction(publish ? "publish-dish" : "draft-dish");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        portions: Number(form.portions),
        ingredients: form.ingredients,
        tags: form.tags,
        allergens: form.allergens,
        image_url: form.image_url,
        schedule: form.schedule.trim(),
        action: publish ? "publish" : "draft",
        status: publish ? "published" : "draft",
      };

      if (selectedId) {
        await updateChefDish(selectedId, payload);
        setNotice(
          publish ? "Plato actualizado y publicado." : "Borrador actualizado.",
        );
      } else {
        await createChefDish(payload);
        setNotice(
          publish
            ? "Plato creado y publicado."
            : "Plato guardado como borrador.",
        );
      }
      await load();
      if (!selectedId) setForm(emptyForm());
    } catch (err) {
      setNotice(
        err?.response?.data?.detail || "No se pudo guardar el plato.",
        true,
      );
    } finally {
      setLoadingAction((current) =>
        current === "publish-dish" || current === "draft-dish" ? "" : current,
      );
    }
  };

  const setDishStatus = async (dishId, status) => {
    setLoadingAction(`status-${dishId}`);
    try {
      await updateChefDish(dishId, { status });
      setNotice("Estado del plato actualizado.");
      await load();
    } catch (err) {
      setNotice(
        err?.response?.data?.detail || "No se pudo actualizar estado.",
        true,
      );
    } finally {
      setLoadingAction((current) =>
        current === `status-${dishId}` ? "" : current,
      );
    }
  };

  const removeDish = async (dishId) => {
    setLoadingAction(`remove-${dishId}`);
    try {
      await deleteChefDish(dishId);
      if (selectedId === dishId) {
        setSelectedId("");
        setForm(emptyForm());
      }
      setNotice("Plato eliminado.");
      await load();
    } catch (err) {
      setNotice(
        err?.response?.data?.detail || "No se pudo eliminar plato.",
        true,
      );
    } finally {
      setLoadingAction((current) =>
        current === `remove-${dishId}` ? "" : current,
      );
    }
  };

  const isEditing = !!selectedId;

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis platos</h1>
          <p style={{ color: "var(--muted)" }}>
            Administra los platos que ofreces en HomeChef.
          </p>
        </div>
        <LoadingButton
          type="button"
          onClick={onNewDish}
          className="px-4 py-2 rounded-lg text-white font-semibold self-start sm:self-auto"
          style={{
            background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
          }}
          loading={loadingAction === "new-dish"}
          loadingLabel="Cargando..."
        >
          + Nuevo plato
        </LoadingButton>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
        <aside
          className="rounded-xl border p-3 space-y-3 min-[1024px]:w-auto"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--panel)",
          }}
        >
          <div className="flex gap-2">
            <input
              className="h-11 w-full rounded-lg border px-3"
              style={{
                borderColor: "var(--line)",
                backgroundColor: "transparent",
              }}
              placeholder="Buscar plato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              label={`Todos ${counters.all}`}
            />
            <TabButton
              active={activeTab === "published"}
              onClick={() => setActiveTab("published")}
              label={`Publicados ${counters.published}`}
            />
            <TabButton
              active={activeTab === "draft"}
              onClick={() => setActiveTab("draft")}
              label={`Borradores ${counters.draft}`}
            />
            <TabButton
              active={activeTab === "paused"}
              onClick={() => setActiveTab("paused")}
              label={`Pausados ${counters.paused}`}
            />
          </div>

          <div className="space-y-2 max-h-[640px] overflow-auto pr-1">
            {filteredItems.map((dish) => (
              <article
                key={dish._id}
                className="rounded-xl border p-2 cursor-pointer"
                style={{
                  borderColor:
                    selectedId === dish._id ? "var(--brand)" : "var(--line)",
                  backgroundColor:
                    selectedId === dish._id
                      ? "var(--panel-soft)"
                      : "var(--panel)",
                }}
                onClick={() => onSelectDish(dish)}
              >
                <div className="flex gap-3">
                  <div
                    className="h-20 w-24 rounded-lg overflow-hidden border shrink-0"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {dish.image_url ? (
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs opacity-70">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xl truncate">
                      {dish.name}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      Bs {Number(dish.price || 0).toFixed(2)} ·{" "}
                      {dish.portions || 0} porciones
                    </p>
                    <p className="text-sm mt-1">
                      {STATUS_LABELS[dish.status] || dish.status}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <LoadingButton
                        type="button"
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: "var(--line)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDishStatus(
                            dish._id,
                            dish.status === "paused" ? "published" : "paused",
                          );
                        }}
                        loading={loadingAction === `status-${dish._id}`}
                        loadingLabel="..."
                      >
                        {dish.status === "paused" ? "Reactivar" : "Pausar"}
                      </LoadingButton>
                      <LoadingButton
                        type="button"
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: "var(--line)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDish(dish._id);
                        }}
                        loading={loadingAction === `remove-${dish._id}`}
                        loadingLabel="..."
                      >
                        Eliminar
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!filteredItems.length && (
              <p style={{ color: "var(--muted)" }}>Sin resultados.</p>
            )}
          </div>
        </aside>

        <section
          className="rounded-xl border p-4 space-y-4 min-[1024px]:w-auto"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--panel)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {isEditing ? "Editar plato" : "Nuevo plato"}
            </h2>
          </div>

          <div className="grid lg:grid-cols-[420px_minmax(0,1fr)] gap-4">
            <div className="space-y-2">
              <p className="font-medium">Foto del plato</p>
              <div
                className="h-[220px] rounded-xl border border-dashed overflow-hidden"
                style={{
                  borderColor: "var(--line)",
                  backgroundColor: "var(--panel-soft)",
                }}
              >
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Foto del plato"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-center px-4">
                    <p style={{ color: "var(--muted)" }}>
                      Sube una foto deliciosa (JPG/PNG)
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  type="button"
                  className="flex-1 h-11 rounded-lg border"
                  style={{ borderColor: "var(--line)" }}
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadingImage}
                  loadingLabel="Subiendo..."
                >
                  Subir foto
                </LoadingButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImage}
                />
                <LoadingButton
                  type="button"
                  className="w-11 rounded-lg border"
                  style={{ borderColor: "var(--line)" }}
                  onClick={() => {
                    setLoadingAction("remove-image");
                    onRemoveImage();
                    window.setTimeout(
                      () =>
                        setLoadingAction((current) =>
                          current === "remove-image" ? "" : current,
                        ),
                      150,
                    );
                  }}
                  title="Quitar foto"
                  loading={loadingAction === "remove-image"}
                  loadingLabel="..."
                >
                  🗑
                </LoadingButton>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Nombre del plato"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Precio (Bs)"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.price}
                  onChange={(v) => setForm({ ...form, price: v })}
                />
                <Input
                  label="Porciones"
                  type="number"
                  min="1"
                  value={form.portions}
                  onChange={(v) => setForm({ ...form, portions: v })}
                />
              </div>
              <Input
                label="Horario disponible"
                value={form.schedule}
                onChange={(v) => setForm({ ...form, schedule: v })}
                placeholder="11:00 - 15:00"
              />
            </div>
          </div>

          <TextArea
            label="Descripción"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
          />

          <div className="grid md:grid-cols-3 gap-3">
            <IngredientsSelector
              label="Ingredientes"
              options={INGREDIENTES}
              selected={form.ingredients}
              onChange={(v) => setForm({ ...form, ingredients: v })}
            />
            <EnumSelector
              label="Etiquetas"
              options={ETIQUETAS}
              selected={form.tags}
              onToggle={(v) => toggleArrayValue("tags", v)}
            />
            <EnumSelector
              label="Alergenos"
              options={ALERGENOS}
              selected={form.allergens}
              onToggle={(v) => toggleArrayValue("allergens", v)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <label className="block">
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
                Estado del plato
              </p>
              <select
                className="h-11 w-full rounded-lg border px-3"
                style={{
                  borderColor: "var(--line)",
                  backgroundColor: "transparent",
                }}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {DISH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap justify-start sm:justify-end gap-2">
              <LoadingButton
                type="button"
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: "var(--line)" }}
                onClick={() => saveDish({ publish: false })}
                loading={loadingAction === "draft-dish"}
                loadingLabel="Guardando..."
              >
                Guardar borrador
              </LoadingButton>
              <LoadingButton
                type="button"
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{
                  background:
                    "linear-gradient(90deg, var(--brand), var(--brand-2))",
                }}
                onClick={() => saveDish({ publish: true })}
                loading={loadingAction === "publish-dish"}
                loadingLabel="Publicando..."
              >
                Publicar plato
              </LoadingButton>
            </div>
          </div>
        </section>
      </div>

      {message && (
        <p className={isError ? "text-red-500" : "text-emerald-500"}>
          {message}
        </p>
      )}
    </section>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-lg border text-sm"
      style={{
        borderColor: active ? "var(--brand)" : "var(--line)",
        color: active ? "var(--brand-2)" : "var(--text)",
        backgroundColor: active ? "var(--panel-soft)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function EnumSelector({ label, options, selected, onToggle }) {
  const [customText, setCustomText] = useState("");
  const availableOptions = options.filter((x) => !selected.includes(x));

  const handleAddCustom = () => {
    const clean = customText.trim().toUpperCase().replaceAll(" ", "_");
    if (clean && !selected.includes(clean)) {
      onToggle(clean);
      setCustomText("");
    }
  };

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--line)",
        backgroundColor: "var(--panel-soft)",
      }}
    >
      <p className="font-semibold mb-2">{label}</p>
      <SearchableSelect
        options={availableOptions}
        value=""
        onChange={(val) => val && onToggle(val)}
        placeholder="Seleccionar..."
        formatOption={prettyLabel}
      />

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          className="h-9 w-full rounded-lg border px-2 text-sm"
          style={{ borderColor: "var(--line)", backgroundColor: "transparent" }}
          placeholder={`Otro ${label.toLowerCase()}...`}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <button
          type="button"
          className="h-9 w-10 shrink-0 rounded-lg border text-sm grid place-items-center font-bold"
          style={{ borderColor: "var(--line)", backgroundColor: "var(--panel)" }}
          onClick={handleAddCustom}
          title={`Agregar ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {selected.map((item) => (
          <button
            key={item}
            type="button"
            className="text-xs px-2 py-1 rounded-full border transition-colors hover:bg-red-50"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--panel)",
            }}
            onClick={() => onToggle(item)}
            title="Quitar"
          >
            {prettyLabel(item)} ✕
          </button>
        ))}
      </div>
    </div>
  );
}

function IngredientsSelector({ label, options, selected, onChange }) {
  const selectedNames = selected.map((s) => s.name);

  const handleAdd = (name) => {
    onChange([...selected, { name, quantity: 1, unit: "u" }]);
  };

  const handleRemove = (name) => {
    onChange(selected.filter((s) => s.name !== name));
  };

  const handleUpdate = (name, field, value) => {
    onChange(
      selected.map((s) => (s.name === name ? { ...s, [field]: value } : s)),
    );
  };

  const availableOptions = options.filter((x) => !selectedNames.includes(x));

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-3"
      style={{
        borderColor: "var(--line)",
        backgroundColor: "var(--panel-soft)",
      }}
    >
      <p className="font-semibold">{label}</p>
      <SearchableSelect
        options={availableOptions}
        value=""
        onChange={(val) => val && handleAdd(val)}
        placeholder="Añadir ingrediente..."
        formatOption={prettyLabel}
      />
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {selected.map((item) => (
          <div
            key={item.name}
            className="flex flex-wrap items-center gap-2 p-2 rounded-lg border text-sm"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--panel)",
            }}
          >
            <span className="font-medium flex-1 min-w-[100px]">
              {prettyLabel(item.name)}
            </span>
            <input
              type="number"
              min="0.01"
              step="any"
              className="w-20 px-2 py-1 rounded border bg-transparent"
              style={{ borderColor: "var(--line)" }}
              value={item.quantity}
              onChange={(e) =>
                handleUpdate(item.name, "quantity", e.target.value)
              }
              placeholder="Cant."
            />
            <select
              className="w-20 px-2 py-1 rounded border bg-transparent"
              style={{ borderColor: "var(--line)" }}
              value={item.unit}
              onChange={(e) => handleUpdate(item.name, "unit", e.target.value)}
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">Litros</option>
              <option value="ml">ml</option>
              <option value="u">Unid.</option>
            </select>
            <button
              type="button"
              className="text-red-500 font-bold px-2"
              onClick={() => handleRemove(item.name)}
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function prettyLabel(value) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toChatbotDishContext(dish) {
  return {
    id: dish._id || dish.id || "",
    name: dish.name || "",
    price: Number(dish.price || 0),
    portions: Number(dish.portions || 0),
    status: STATUS_LABELS[dish.status] || dish.status || "Sin estado",
    raw_status: dish.status || "",
  };
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  step,
}) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <input
        type={type}
        min={min}
        step={step}
        className="h-11 w-full rounded-lg border px-3"
        style={{ borderColor: "var(--line)", backgroundColor: "transparent" }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <textarea
        className="min-h-[96px] w-full rounded-lg border px-3 py-2"
        style={{ borderColor: "var(--line)", backgroundColor: "transparent" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
