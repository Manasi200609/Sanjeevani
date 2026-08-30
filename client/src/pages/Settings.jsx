import { useState } from "react";
import {
  User,
  Globe,
  Bell,
  Save,
  Check,
  MapPin,
} from "lucide-react";
import { useLanguage } from "../services/LanguageContext";

export default function Settings() {
  const { t, language, setLanguage, profile, setProfile, languages } =
    useLanguage();

  const [localProfile, setLocalProfile] = useState({ ...profile });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setProfile(localProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <section className="page-header">
        <div>
          <div className="section-eyebrow">{t("nav.settings").toUpperCase()}</div>
          <h2 className="page-title">{t("settings.title")}</h2>
          <p className="page-subtitle">{t("settings.profileDescription")}</p>
        </div>
      </section>

      {/* =====================================================
          PROFILE SECTION
      ====================================================== */}

      <section className="settings-section">
        <div className="settings-section-header">
          <User size={18} />
          <div>
            <h3>{t("settings.profile")}</h3>
            <p>{t("settings.profileDescription")}</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="form-group">
            <label>{t("settings.name")}</label>
            <input
              type="text"
              value={localProfile.name}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, name: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t("settings.village")}</label>
              <input
                type="text"
                value={localProfile.village}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, village: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>{t("settings.district")}</label>
              <input
                type="text"
                value={localProfile.district}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, district: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t("settings.state")}</label>
            <input
              type="text"
              value={localProfile.state}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, state: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          LANGUAGE SECTION
      ====================================================== */}

      <section className="settings-section">
        <div className="settings-section-header">
          <Globe size={18} />
          <div>
            <h3>{t("settings.language")}</h3>
            <p>{t("settings.languageDescription")}</p>
          </div>
        </div>

        <div className="language-grid">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-card ${language === lang.code ? "active" : ""}`}
              onClick={() => setLanguage(lang.code)}
            >
              <div className="language-native">{lang.native}</div>
              <div className="language-english">{lang.name}</div>
              {language === lang.code && (
                <div className="language-check">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* =====================================================
          NOTIFICATIONS SECTION
      ====================================================== */}

      <section className="settings-section">
        <div className="settings-section-header">
          <Bell size={18} />
          <div>
            <h3>{t("settings.notifications")}</h3>
            <p>{t("settings.notificationsDescription")}</p>
          </div>
        </div>

        <div className="settings-toggles">
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-label">{t("settings.dailyDigest")}</div>
              <div className="toggle-description">
                {t("settings.dailyDigestDescription")}
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-label">{t("settings.urgentAlerts")}</div>
              <div className="toggle-description">
                {t("settings.urgentAlertsDescription")}
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* =====================================================
          SAVE BUTTON
      ====================================================== */}

      <div className="settings-actions">
        <button className="setup-button" onClick={handleSave}>
          {saved ? (
            <>
              <Check size={15} /> {t("settings.saved")}
            </>
          ) : (
            <>
              <Save size={15} /> {t("settings.save")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
