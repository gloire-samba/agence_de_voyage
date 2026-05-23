import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtilisateurService } from '../../services/utilisateur.service';
import { AuthService } from '../../services/auth.service';
import '../admin-voyages/AdminVoyages.css'; 

export const AdminUtilisateursComponent = () => {
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const idAdminActuel = AuthService.getUserId();

  const [texteRecherche, setTexteRecherche] = useState('');
  const [filtreEmail, setFiltreEmail] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [filtreDateInscription, setFiltreDateInscription] = useState('');

  const [critereTri, setCritereTri] = useState('id');
  const [triAscendant, setTriAscendant] = useState(true);

  useEffect(() => {
    chargerUtilisateurs();
  }, []);

  const chargerUtilisateurs = () => {
    UtilisateurService.getTous()
      .then((data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.utilisateurs || data;
        const listeComplete = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        // On cache l'admin actuel de la liste
        setUtilisateurs(listeComplete.filter(u => u.id !== idAdminActuel));
      })
      .catch((err) => {
        if (err.status === 404 || err.status === 204) setUtilisateurs([]);
        else alert('Erreur lors du chargement des utilisateurs.');
      });
  };

  const supprimerUtilisateur = (id: number) => {
    if (id === idAdminActuel) {
      alert("Vous ne pouvez pas supprimer votre propre compte admin.");
      return;
    }
    if (window.confirm("Êtes-vous sûr de vouloir bannir et supprimer cet utilisateur ? Cette action détruira aussi son historique et ses réservations.")) {
      UtilisateurService.supprimer(id)
        .then(() => {
          alert("✅ Utilisateur banni et supprimé.");
          chargerUtilisateurs();
        })
        .catch(() => alert("Erreur lors de la suppression."));
    }
  };

  const modifierUtilisateur = (id: number) => navigate(`/admin/utilisateurs/${id}/modifier`);
  const voirReservationsUtilisateur = (id: number) => navigate(`/admin/utilisateurs/${id}/reservations`);
  const voirAvisUtilisateur = (id: number) => navigate(`/admin/utilisateurs/${id}/avis`);

  const changerTri = (critere: string) => {
    if (critereTri === critere) setTriAscendant(!triAscendant);
    else { setCritereTri(critere); setTriAscendant(true); }
  };

  const getUtilisateursFiltres = () => {
    let resultats = utilisateurs.filter(u => {
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const rechercheGlobale = texteRecherche.toLowerCase();

      const matchGlobal = !texteRecherche || email.includes(rechercheGlobale) || role.includes(rechercheGlobale) || u.id.toString().includes(rechercheGlobale);
      const matchEmail = !filtreEmail || email.includes(filtreEmail.toLowerCase());
      const matchRole = !filtreRole || role.includes(filtreRole.toLowerCase());
      
      let matchDate = true;
      if (filtreDateInscription) {
        const dateInscrit = u.dateInscription || u.date_inscription || '';
        matchDate = dateInscrit.startsWith(filtreDateInscription);
      }

      return matchGlobal && matchEmail && matchRole && matchDate;
    });

    resultats.sort((a, b) => {
      let valA = a[critereTri] || '';
      let valB = b[critereTri] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return triAscendant ? -1 : 1;
      if (valA > valB) return triAscendant ? 1 : -1;
      return 0;
    });

    return resultats;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const utilisateursFiltres = getUtilisateursFiltres();

  return (
    <div className="crud-section">
      <div className="section-header">
        <h3>Gestion des Comptes Utilisateurs</h3>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label>Email exact ou partiel</label>
          <input type="text" value={filtreEmail} onChange={e => setFiltreEmail(e.target.value)} placeholder="Ex: client25@mail..." />
        </div>
        <div className="filter-group">
          <label>Rôle</label>
          <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="ROLE_USER">Utilisateur (USER)</option>
            <option value="ROLE_ADMIN">Administrateur (ADMIN)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Date d'inscription</label>
          <input type="date" value={filtreDateInscription} onChange={e => setFiltreDateInscription(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Recherche Rapide ID</label>
          <input type="text" value={texteRecherche} onChange={e => setTexteRecherche(e.target.value)} placeholder="Saisir un ID..." />
        </div>
      </div>
      
      <table className="admin-table">
        <thead>
          <tr>
            <th onClick={() => changerTri('id')} style={{ cursor: 'pointer' }}>ID ↕️</th>
            <th onClick={() => changerTri('email')} style={{ cursor: 'pointer' }}>Adresse Email ↕️</th>
            <th onClick={() => changerTri('role')} style={{ cursor: 'pointer' }}>Rôle ↕️</th>
            <th>Date d'inscription</th> 
            <th>Actions Administrateur</th>
          </tr>
        </thead>
        <tbody>
          {utilisateursFiltres.map((u) => (
            <tr key={u.id}>
              <td><strong>#{u.id}</strong></td>
              <td>{u.email || 'N/A'}</td>
              <td>
                {/* 👉 LA CORRECTION EST ICI : On appelle les nouvelles classes CSS */}
                <span className={`badge-statut ${u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER'}`}>
                  {u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </td>
              <td>{formatDate(u.dateInscription || u.date_inscription)}</td>
              <td className="action-cells">
                <button className="btn-action btn-edit" onClick={() => modifierUtilisateur(u.id)}>✏️ Modifier</button> 
                <button className="btn-action btn-view" onClick={() => voirReservationsUtilisateur(u.id)}>🎫 Réservations</button>
                <button className="btn-action btn-view" onClick={() => voirAvisUtilisateur(u.id)}>⭐ Modérer Avis</button>
                <button className="btn-action btn-delete" onClick={() => supprimerUtilisateur(u.id)}>🚫 Bannir</button>
              </td>
            </tr>
          ))}
          {utilisateursFiltres.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Aucun utilisateur ne correspond à vos critères de recherche.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};