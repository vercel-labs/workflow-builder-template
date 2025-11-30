'use client';

import * as React from 'react';
import { parseDate } from 'chrono-node';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { TemplateBadgeInput } from '@/components/ui/template-badge-input';

function formatDateTime(date: Date | undefined) {
	if (!date) {
		return '';
	}
	const dateStr = date.toLocaleDateString('en-US', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
	const timeStr = date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
	return `${dateStr} at ${timeStr}`;
}

interface DateInputProps {
	label?: string;
	description?: string;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	maxDays?: number;
}

export function DateInput({
	label = 'Date/Time',
	description,
	value = '',
	onChange,
	disabled,
	maxDays,
}: DateInputProps) {
	const [open, setOpen] = React.useState(false);

	const parsedDate = React.useMemo(() => {
		if (!value) return undefined;
		const isoDate = new Date(value);
		if (!Number.isNaN(isoDate.getTime())) return isoDate;
		return parseDate(value) || undefined;
	}, [value]);

	const [month, setMonth] = React.useState<Date | undefined>(parsedDate);

	// Sync month state when parsedDate changes (e.g., value prop updated programmatically)
	React.useEffect(() => {
		if (parsedDate) {
			setMonth(parsedDate);
		}
	}, [parsedDate]);

	const now = new Date();
	const defaultHours = now.getHours();
	const defaultMinutes = now.getMinutes();

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const maxDate = React.useMemo(() => {
		if (!maxDays) return undefined;
		const max = new Date();
		max.setDate(max.getDate() + maxDays);
		max.setHours(23, 59, 59, 999);
		return max;
	}, [maxDays]);

	const hours = parsedDate?.getHours() ?? defaultHours;
	const minutes = parsedDate?.getMinutes() ?? defaultMinutes;

	const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

	const updateDateTime = (date: Date, hour: number, minute: number) => {
		const newDate = new Date(date);
		newDate.setHours(hour, minute, 0, 0);
		onChange?.(newDate.toISOString());
	};

	return (
		<div className="flex flex-col gap-3">
			<Label htmlFor="date" className="px-1">
				{label}
			</Label>

			<div className="relative flex gap-2">
				<TemplateBadgeInput
					id="date"
					value={value}
					placeholder="Enter a date or time"
					className="pr-10"
					disabled={disabled}
					onChange={(newValue) => {
						const parsed = parseDate(newValue);
						if (parsed) {
							setMonth(parsed);
							onChange?.(parsed.toISOString());
						} else {
							onChange?.(newValue);
						}
					}}
				/>

				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							id="date-picker"
							variant="ghost"
							className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
							disabled={disabled}
						>
							<CalendarIcon className="size-3.5" />
							<span className="sr-only">Select date and time</span>
						</Button>
					</PopoverTrigger>

					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={parsedDate}
							captionLayout="dropdown"
							month={month}
							onMonthChange={setMonth}
							disabled={(date) => {
								if (date < today) return true;
								if (maxDate && date > maxDate) return true;
								return false;
							}}
							onSelect={(selectedDate) => {
								if (selectedDate) {
									updateDateTime(selectedDate, hours, minutes);
									setMonth(selectedDate);
								}
							}}
						/>
						<div className="border-t p-3">
							<div className="flex items-center gap-2">
								<Input
									type="time"
									value={timeValue}
									className="w-auto"
									onChange={(e) => {
										if (parsedDate && e.target.value) {
											const [h, m] = e.target.value.split(':').map(Number);
											updateDateTime(parsedDate, h, m);
										}
									}}
								/>
								<Button variant="outline" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
									Done
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
			{description && parsedDate && (
				<div className="text-muted-foreground px-1 text-sm">
					{description} <span className="font-medium">{formatDateTime(parsedDate)}</span>.
				</div>
			)}
		</div>
	);
}
