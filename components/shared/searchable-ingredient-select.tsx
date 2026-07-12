"use client";
import React, { useState, useRef, useEffect } from "react";
import { IngredientReference } from "@prisma/client";

interface Props {
    ingredients: IngredientReference[];
    value: number; // selected ingredient id
    onChange: (id: number) => void;
    placeholder?: string;
    className?: string;
}

export function SearchableIngredientSelect({
                                               ingredients,
                                               value,
                                               onChange,
                                               placeholder = "Search ingredient...",
                                               className = "",
                                           }: Props) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter out any invalid ingredients
    const validIngredients = ingredients.filter(ing => ing && typeof ing === 'object' && ing.id != null);

    const selectedIngredient = validIngredients.find((ing) => ing.id === value);

    const filtered = validIngredients.filter((ing) => {
        const name = (ing.name || "").toLowerCase();
        const nameAr = (ing.name_ar || "").toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || nameAr.includes(q);
    });

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
                    const selected = filtered[highlightedIndex];
                    if (selected) {
                        onChange(selected.id);
                        setQuery(selected.name || "");
                        setIsOpen(false);
                    }
                }
                break;
            case "Escape":
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleSelect = (ing: IngredientReference) => {
        if (!ing) return;
        onChange(ing.id);
        setQuery(ing.name || "");
        setIsOpen(false);
        inputRef.current?.focus();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={query || (selectedIngredient ? selectedIngredient.name : "")}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full border border-black p-1.5   text-xs rounded-none focus:outline-none mt-1 bg-white"
            />
            {isOpen && filtered.length > 0 && (
                <ul className="absolute z-10 w-full max-h-60 overflow-y-auto border border-black bg-white mt-1 rounded-none shadow-lg">
                    {filtered.map((ing, index) => (
                        <li
                            key={ing.id}
                            className={`px-2 py-1 cursor-pointer hover:bg-neutral-100 text-xs   ${
                                index === highlightedIndex ? "bg-neutral-200" : ""
                            }`}
                            onClick={() => handleSelect(ing)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <div>
                                <span className="font-bold">{ing.name || "Unnamed"}</span>
                                {ing.name_ar && <span className="text-neutral-500 ml-2">{ing.name_ar}</span>}
                                <span className="text-neutral-400 ml-2">({Number(ing.calories_per_g)} kcal/g)</span>
                                {ing.allergens && ing.allergens.length > 0 && (
                                    <span className="ml-2 text-red-500 text-[10px] font-bold uppercase">
                                        {ing.allergens.join(", ")}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {isOpen && filtered.length === 0 && (
                <div className="absolute z-10 w-full border border-black bg-white mt-1 p-2 text-xs text-neutral-500">
                    No ingredients found
                </div>
            )}
        </div>
    );
}