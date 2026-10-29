import React from '../react.js';

// Entrée de liste qui se replie au lieu de disparaître d'un coup. Le rôle `listitem` est porté
// par ce conteneur (enfant direct de la liste), pas par la carte qu'il enveloppe.
export const CollapseItem = ({ isLeaving = false, children, ...rest }) => (
  <div
    role="listitem"
    className={`cn-collapse${isLeaving ? ' cn-collapse--leaving' : ''}`}
    aria-hidden={isLeaving ? 'true' : undefined}
    inert={isLeaving ? '' : undefined}
    {...rest}
  >
    <div className="cn-collapse__inner">{children}</div>
  </div>
);

export default CollapseItem;
