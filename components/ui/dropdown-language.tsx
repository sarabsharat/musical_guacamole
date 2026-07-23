'use client';

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
    trigger: ReactElement;
    defaultOpen?: boolean;
    align?: 'start' | 'center' | 'end';
};

type Language = {
    value: string;
    label: string;
    icon: string;
};

const LANGUAGES: Language[] = [
    { value: 'en', label: 'English', icon: 'https://flagcdn.com/16x12/us.png' },
    { value: 'ar', label: 'عربي (Arabic)', icon: 'https://flagcdn.com/16x12/jo.png' },
];

const itemClass = 'cursor-pointer gap-2 pl-2 text-sm data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground [&>span]:hidden';

const LanguageDropdown = ({ trigger, defaultOpen, align = 'end' }: Props) => {
    const { i18n } = useTranslation();

    const currentLang = i18n.language || 'en';

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        // Optionally, update HTML lang attribute if you have a listener
        document.documentElement.lang = lang;
    };

    return (
        <DropdownMenu defaultOpen={defaultOpen}>
            <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent className="w-50" align={align}>
                <DropdownMenuRadioGroup
                    value={currentLang}
                    onValueChange={handleLanguageChange}
                    className="flex flex-col gap-2"
                >
                    {LANGUAGES.map(({ value, label, icon }) => (
                        <DropdownMenuRadioItem key={value} value={value} className={itemClass}>
                            <img src={icon} alt={label} width={16} height={16} className="rounded-full" />
                            {label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageDropdown;