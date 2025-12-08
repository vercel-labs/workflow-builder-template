"use client";

import { ethers } from "ethers";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import type { ActionConfigFieldBase } from "@/plugins";

type FieldProps = {
  field: ActionConfigFieldBase;
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

type AbiWithAutoFetchProps = FieldProps & {
  contractAddressField?: string;
  networkField?: string;
  config: Record<string, unknown>;
};

export function AbiWithAutoFetchField({
  field,
  value,
  onChange,
  disabled,
  contractAddressField = "contractAddress",
  networkField = "network",
  config,
}: AbiWithAutoFetchProps) {
  const [useManualAbi, setUseManualAbi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = (config[contractAddressField] as string) || "";
  const network = (config[networkField] as string) || "";

  // Validate contract address
  const isValidAddress = React.useMemo(() => {
    if (!contractAddress || contractAddress.trim() === "") {
      return false;
    }
    try {
      return ethers.isAddress(contractAddress);
    } catch {
      return false;
    }
  }, [contractAddress]);

  const handleFetchAbi = async () => {
    if (!(isValidAddress && network)) {
      setError("Please enter a valid contract address and select a network");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/web3/fetch-abi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress,
          network,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        abi?: string;
        error?: string;
      };

      if (!(response.ok && data.success && data.abi)) {
        const errorMessage = data.error || "Failed to fetch ABI from Etherscan";
        throw new Error(errorMessage);
      }

      onChange(data.abi);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch ABI";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualToggle = (checked: boolean) => {
    setUseManualAbi(checked);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          disabled={
            disabled || isLoading || !isValidAddress || !network || useManualAbi
          }
          onClick={handleFetchAbi}
          size="sm"
          type="button"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              Fetching...
            </>
          ) : (
            "Fetch ABI from Etherscan"
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={useManualAbi}
            disabled={disabled}
            id={`${field.key}-manual`}
            onCheckedChange={handleManualToggle}
          />
          <Label
            className="cursor-pointer font-normal text-sm"
            htmlFor={`${field.key}-manual`}
          >
            Use manual ABI
          </Label>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-destructive text-sm">
          {error}
        </div>
      )}

      <TemplateBadgeTextarea
        disabled={disabled || isLoading || !useManualAbi}
        id={field.key}
        onChange={(val) => {
          onChange(val);
          setError(null);
        }}
        placeholder={
          useManualAbi
            ? "Paste contract ABI JSON here"
            : "Click 'Fetch ABI from Etherscan' or enable 'Use manual ABI' to enter manually"
        }
        rows={field.rows || 6}
        value={value}
      />

      {!(useManualAbi || error) && (
        <p className="text-muted-foreground text-xs">
          {isValidAddress && network
            ? "Click the button above to fetch the ABI from Etherscan"
            : "Enter a contract address and select a network to fetch the ABI"}
        </p>
      )}
    </div>
  );
}
