import { v4 as uuidv4 } from "uuid";
import { DateRule, RequiredRule, UuidRule, Validator } from "../validation";

export interface EntityState {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// ===== ADIÇÃO: rastreio de mudança tipado =====
export type EntityDiff<TState> = Partial<{
  [Key in keyof TState]: {
    previous: TState[Key];
    current: TState[Key];
  };
}>;

export interface ClonePropsResult<TState> {
  props: TState;
  diff: EntityDiff<TState>;
}
// ===== fim da adição (tipos) =====

export abstract class Entity<TState extends EntityState> {
  protected readonly props: Readonly<TState>;

  protected constructor(props: TState) {
    const createdAt = props.createdAt ?? new Date();
    const updatedAt = props.updatedAt ?? cloneDate(createdAt);
    const deletedAt = props.deletedAt ?? null;

    this.props = Object.freeze({
      ...props,
      id: props.id ?? uuidv4(),
      createdAt: cloneDate(createdAt),
      updatedAt: cloneDate(updatedAt),
      deletedAt: deletedAt === null ? null : cloneDate(deletedAt),
    }) as Readonly<TState>;

    this.validateId();
    this.validateTimestamps();
  }

  get id(): string {
    return this.props.id!;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  get deletedAt(): Date | null | undefined {
    return this.props.deletedAt;
  }

  equals(entity?: Entity<TState> | null): boolean {
    return entity !== null && entity !== undefined && this.id === entity.id;
  }

  clone(data: Partial<TState>): this {
    const EntityClass = this.constructor as new (props: TState) => this;

    return new EntityClass({
      ...(this.props as TState),
      ...data,
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  // ===== ADIÇÃO: cloneProps (próximo estado + diff tipado) =====
  // Aplica `overrides` sobre o estado atual e devolve o próximo `props` mais o
  // diff do que mudou ({ campo: { previous, current } }). É inspeção PURA: não
  // constrói a entidade nem valida. Para criar uma nova instância (com updatedAt
  // renovado e validação no construtor) continue usando `clone(...)`.
  cloneProps(overrides: Partial<TState>): ClonePropsResult<TState> {
    const current = deepClone(this.props as TState);
    const next = deepMerge(current, overrides);

    return {
      props: next,
      diff: diffProps(this.props as TState, next),
    };
  }
  // ===== fim da adição (cloneProps) =====

  // ===== ADIÇÃO: toJSON =====
  toJSON(): TState {
    return this.props as TState;
  }
  // ===== fim da adição (toJSON) =====

  public abstract validate(): void;

  private validateId(): void {
    Validator.validate([
      {
        code: "id",
        value: this.id,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }

  private validateTimestamps(): void {
    Validator.validate([
      {
        code: "createdAt",
        value: this.createdAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "updatedAt",
        value: this.updatedAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "deletedAt",
        value: this.deletedAt,
        rules: [new DateRule()],
      },
    ]);
  }
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

// ===== ADIÇÃO: helpers de diff (privados ao módulo) =====
// Deep clone próprio (sem depender de structuredClone): trata Date e Array como
// folhas e clona objetos planos recursivamente. Mantém o módulo autossuficiente.
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as object)) {
    out[key] = deepClone((value as Record<string, unknown>)[key]);
  }
  return out as T;
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = target as Record<string, unknown>;

  for (const key of Object.keys(source) as (keyof T)[]) {
    const value = (source as Record<string, unknown>)[key as string];
    const isPlainObject =
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date);

    if (isPlainObject) {
      const current = result[key as string];
      const base = current && typeof current === "object" ? current : {};
      result[key as string] = deepMerge(
        base as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key as string] = value;
    }
  }

  return result as T;
}

function diffProps<TState>(previous: TState, current: TState): EntityDiff<TState> {
  const diff: Partial<Record<keyof TState, { previous: unknown; current: unknown }>> = {};
  const keys = new Set([
    ...Object.keys(previous as object),
    ...Object.keys(current as object),
  ]) as Set<keyof TState>;

  for (const key of keys) {
    if (!isEqual(previous[key], current[key])) {
      diff[key] = {
        previous: previous[key],
        current: current[key],
      };
    }
  }

  return diff as EntityDiff<TState>;
}

function isEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftIsArray = Array.isArray(left);
    const rightIsArray = Array.isArray(right);

    if (leftIsArray || rightIsArray) {
      if (!leftIsArray || !rightIsArray || left.length !== right.length) {
        return false;
      }
      return left.every((item, index) => isEqual(item, right[index]));
    }

    const leftKeys = Object.keys(left as object);
    const rightKeys = Object.keys(right as object);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) =>
      isEqual(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
    );
  }

  return false;
}
// ===== fim da adição (helpers de diff) =====
