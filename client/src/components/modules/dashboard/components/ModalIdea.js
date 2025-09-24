// client/src/components/modules/dashboard/components/ModalIdea.js
import React, { useEffect, useState } from "react";
import Button from "../../../common/Button";
import { CATEGORIAS, IMPACTOS } from "../utils/constants";

/**
 * Props:
 * - isOpen (bool)
 * - initialData (idea | null)
 * - onClose()
 * - onSave(ideaParcial | completa)  -> debe manejar crear/editar desde el hook
 */
const ModalIdea = ({ isOpen, initialData = null, onClose, onSave }) => {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    categoria: (CATEGORIAS && CATEGORIAS[0]) || "general",
    impacto: (IMPACTOS && IMPACTOS[1]) || "medio",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        titulo: initialData.titulo || "",
        descripcion: initialData.descripcion || "",
        categoria: initialData.categoria || (CATEGORIAS && CATEGORIAS[0]) || "general",
        impacto: initialData.impacto || (IMPACTOS && IMPACTOS[1]) || "medio",
      });
    } else {
      setForm({
        titulo: "",
        descripcion: "",
        categoria: (CATEGORIAS && CATEGORIAS[0]) || "general",
        impacto: (IMPACTOS && IMPACTOS[1]) || "medio",
      });
    }
    setErrors({});
  }, [initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!form.titulo?.trim()) e.titulo = "El título es obligatorio.";
    if (!form.descripcion?.trim()) e.descripcion = "La descripción es obligatoria.";
    if (!form.categoria) e.categoria = "Seleccioná una categoría.";
    if (!form.impacto) e.impacto = "Seleccioná el impacto.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (evt) => {
    evt.preventDefault();
    if (!validate()) return;
    onSave?.({
      ...initialData,
      ...form,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-xl">💡</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {initialData ? "Editar idea" : "Nueva idea"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              className={`w-full rounded-lg border-2 px-4 py-3 text-sm focus:outline-none transition-all duration-200 ${
                errors.titulo ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              }`}
              placeholder="Breve y claro…"
            />
            {errors.titulo && <p className="mt-2 text-xs text-red-600">{errors.titulo}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              rows={5}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className={`w-full rounded-lg border-2 px-4 py-3 text-sm focus:outline-none resize-none transition-all duration-200 ${
                errors.descripcion ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              }`}
              placeholder="Explicá el problema, la propuesta y el impacto esperado…"
            />
            {errors.descripcion && <p className="mt-2 text-xs text-red-600">{errors.descripcion}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-sm focus:outline-none transition-all duration-200 ${
                  errors.categoria ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                }`}
              >
                {(CATEGORIAS || ["general", "proceso", "tecnologia", "comunicacion", "herramientas", "infraestructura"]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
              {errors.categoria && <p className="mt-2 text-xs text-red-600">{errors.categoria}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Impacto</label>
              <select
                value={form.impacto}
                onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
                className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-sm focus:outline-none transition-all duration-200 ${
                  errors.impacto ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                }`}
              >
                {(IMPACTOS || ["bajo", "medio", "alto"]).map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              {errors.impacto && <p className="mt-2 text-xs text-red-600">{errors.impacto}</p>}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !px-6 !py-3 !rounded-xl transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button type="submit" className="!bg-purple-600 hover:!bg-purple-700 !text-white !px-6 !py-3 !rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              {initialData ? 'Guardar Cambios' : 'Guardar Idea'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalIdea;
